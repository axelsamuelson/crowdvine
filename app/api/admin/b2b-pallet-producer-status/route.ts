import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rollupWineDecisions } from "@/lib/b2b-pallet-producer-status";

const emptyToNull = (v: unknown) =>
  v === "" || v === undefined ? null : v;

const nullableTimestamp = z.preprocess(
  emptyToNull,
  z.string().nullable(),
);

const nullableDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .nullable(),
);

const nullableInt = z.preprocess((v) => {
  if (v === "" || v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return v;
}, z.number().int().nullable());

const wineDecisionSchema = z
  .object({
    wine_id: z.string().uuid(),
    decision_status: z.enum(["confirmed", "declined"]),
    confirmed_quantity: nullableInt.optional(),
    reject_reason: z
      .preprocess(emptyToNull, z.string().max(2000).nullable())
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (val.decision_status === "declined") {
      const reason = val.reject_reason?.trim();
      if (!reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "reject_reason krävs vid avslag",
          path: ["reject_reason"],
        });
      }
    }
  });

const upsertSchema = z.object({
  shipment_id: z.string().uuid(),
  producer_id: z.string().uuid(),
  order_sent_at: nullableTimestamp.optional(),
  producer_decision_status: z
    .enum(["pending", "confirmed", "partial", "declined"])
    .optional(),
  producer_decided_at: nullableTimestamp.optional(),
  confirmed_quantity: nullableInt.optional(),
  pickup_date: nullableDate.optional(),
  pickup_date_confirmed_at: nullableTimestamp.optional(),
  goods_ready_at: nullableTimestamp.optional(),
  delivered_to_hub_at: nullableTimestamp.optional(),
  invoice_received_at: nullableTimestamp.optional(),
  invoice_paid_at: nullableTimestamp.optional(),
  invoice_amount_cents: nullableInt.optional(),
  blocked_reason: z
    .preprocess(emptyToNull, z.string().max(2000).nullable())
    .optional(),
  producer_note: z
    .preprocess(emptyToNull, z.string().max(4000).nullable())
    .optional(),
  admin_note: z
    .preprocess(emptyToNull, z.string().max(4000).nullable())
    .optional(),
  wine_decisions: z.array(wineDecisionSchema).min(1).optional(),
});

async function upsertProducerStatus(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const sb = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: existing } = await sb
    .from("b2b_pallet_producer_status")
    .select("*")
    .eq("shipment_id", data.shipment_id)
    .eq("producer_id", data.producer_id)
    .maybeSingle();

  let decision =
    data.producer_decision_status ??
    existing?.producer_decision_status ??
    "pending";
  let decidedAt =
    data.producer_decided_at !== undefined
      ? data.producer_decided_at
      : (existing?.producer_decided_at ?? null);
  let confirmedQuantity =
    data.confirmed_quantity !== undefined
      ? data.confirmed_quantity
      : (existing?.confirmed_quantity ?? null);

  if (data.wine_decisions?.length) {
    const { data: items, error: itemsError } = await sb
      .from("b2b_pallet_shipment_items")
      .select("wine_id, quantity, wines!inner(producer_id)")
      .eq("shipment_id", data.shipment_id)
      .eq("wines.producer_id", data.producer_id);

    if (itemsError) {
      console.error("[b2b-pallet-producer-status] items:", itemsError);
      return NextResponse.json(
        { error: itemsError.message || "Kunde inte läsa viner" },
        { status: 500 },
      );
    }

    const qtyByWine = new Map<string, number>();
    for (const item of items ?? []) {
      const wineId = item.wine_id as string;
      qtyByWine.set(
        wineId,
        (qtyByWine.get(wineId) ?? 0) + (Number(item.quantity) || 0),
      );
    }

    const allowedWineIds = new Set(qtyByWine.keys());
    for (const d of data.wine_decisions) {
      if (!allowedWineIds.has(d.wine_id)) {
        return NextResponse.json(
          {
            error: `Vin ${d.wine_id} tillhör inte denna producent på pallen`,
          },
          { status: 400 },
        );
      }
    }

    if (data.wine_decisions.length !== allowedWineIds.size) {
      return NextResponse.json(
        { error: "Ange beslut för varje vin på pallen för producenten" },
        { status: 400 },
      );
    }
    const decidedIds = new Set(data.wine_decisions.map((d) => d.wine_id));
    for (const wineId of allowedWineIds) {
      if (!decidedIds.has(wineId)) {
        return NextResponse.json(
          { error: "Ange beslut för varje vin på pallen för producenten" },
          { status: 400 },
        );
      }
    }

    const wineRows = data.wine_decisions.map((d) => {
      const orderedQty = qtyByWine.get(d.wine_id) ?? 0;
      const isConfirmed = d.decision_status === "confirmed";
      return {
        shipment_id: data.shipment_id,
        producer_id: data.producer_id,
        wine_id: d.wine_id,
        decision_status: d.decision_status,
        confirmed_quantity: isConfirmed
          ? d.confirmed_quantity != null
            ? d.confirmed_quantity
            : orderedQty
          : 0,
        reject_reason: isConfirmed ? null : d.reject_reason?.trim() || null,
        decided_at: nowIso,
        updated_by: admin.id,
      };
    });

    const { error: wineError } = await sb
      .from("b2b_pallet_producer_wine_status")
      .upsert(wineRows, { onConflict: "shipment_id,wine_id" });

    if (wineError) {
      console.error("[b2b-pallet-producer-status] wine upsert:", wineError);
      return NextResponse.json(
        {
          error:
            wineError.message ||
            "Kunde inte spara vinbeslut (kör migration 193?)",
        },
        { status: 500 },
      );
    }

    const rolled = rollupWineDecisions(
      wineRows.map((r) => ({
        quantity: qtyByWine.get(r.wine_id) ?? 0,
        decisionStatus: r.decision_status,
        confirmedQuantity: r.confirmed_quantity,
      })),
    );
    decision = rolled.producer_decision_status;
    confirmedQuantity = rolled.confirmed_quantity;
    decidedAt = nowIso;
  } else if (
    data.producer_decision_status !== undefined &&
    data.producer_decision_status !== "pending" &&
    decidedAt == null
  ) {
    decidedAt = nowIso;
  }

  // Bulk confirm/reject without wine_decisions: sync all wines
  if (
    !data.wine_decisions?.length &&
    (data.producer_decision_status === "confirmed" ||
      data.producer_decision_status === "declined")
  ) {
    const { data: items } = await sb
      .from("b2b_pallet_shipment_items")
      .select("wine_id, quantity, wines!inner(producer_id)")
      .eq("shipment_id", data.shipment_id)
      .eq("wines.producer_id", data.producer_id);

    const qtyByWine = new Map<string, number>();
    for (const item of items ?? []) {
      const wineId = item.wine_id as string;
      qtyByWine.set(
        wineId,
        (qtyByWine.get(wineId) ?? 0) + (Number(item.quantity) || 0),
      );
    }

    if (qtyByWine.size > 0) {
      const bulkStatus = data.producer_decision_status;
      const wineRows = Array.from(qtyByWine.entries()).map(([wineId, qty]) => ({
        shipment_id: data.shipment_id,
        producer_id: data.producer_id,
        wine_id: wineId,
        decision_status:
          bulkStatus === "confirmed" ? "confirmed" : "declined",
        confirmed_quantity: bulkStatus === "confirmed" ? qty : 0,
        reject_reason:
          bulkStatus === "declined"
            ? data.producer_note?.trim() ||
              data.admin_note?.trim() ||
              "Avböjd av admin"
            : null,
        decided_at: nowIso,
        updated_by: admin.id,
      }));
      await sb
        .from("b2b_pallet_producer_wine_status")
        .upsert(wineRows, { onConflict: "shipment_id,wine_id" });
    }
  }

  const row = {
    shipment_id: data.shipment_id,
    producer_id: data.producer_id,
    order_sent_at:
      data.order_sent_at !== undefined
        ? data.order_sent_at
        : (existing?.order_sent_at ?? null),
    producer_decision_status: decision,
    producer_decided_at: decidedAt,
    confirmed_quantity: confirmedQuantity,
    pickup_date:
      data.pickup_date !== undefined
        ? data.pickup_date
        : (existing?.pickup_date ?? null),
    pickup_date_confirmed_at:
      data.pickup_date_confirmed_at !== undefined
        ? data.pickup_date_confirmed_at
        : (existing?.pickup_date_confirmed_at ?? null),
    goods_ready_at:
      data.goods_ready_at !== undefined
        ? data.goods_ready_at
        : (existing?.goods_ready_at ?? null),
    delivered_to_hub_at:
      data.delivered_to_hub_at !== undefined
        ? data.delivered_to_hub_at
        : (existing?.delivered_to_hub_at ?? null),
    invoice_received_at:
      data.invoice_received_at !== undefined
        ? data.invoice_received_at
        : (existing?.invoice_received_at ?? null),
    invoice_paid_at:
      data.invoice_paid_at !== undefined
        ? data.invoice_paid_at
        : (existing?.invoice_paid_at ?? null),
    invoice_amount_cents:
      data.invoice_amount_cents !== undefined
        ? data.invoice_amount_cents
        : (existing?.invoice_amount_cents ?? null),
    blocked_reason:
      data.blocked_reason !== undefined
        ? data.blocked_reason
        : (existing?.blocked_reason ?? null),
    producer_note:
      data.producer_note !== undefined
        ? data.producer_note
        : (existing?.producer_note ?? null),
    admin_note:
      data.admin_note !== undefined
        ? data.admin_note
        : (existing?.admin_note ?? null),
    updated_by: admin.id,
  };

  const { data: saved, error } = await sb
    .from("b2b_pallet_producer_status")
    .upsert(row, { onConflict: "shipment_id,producer_id" })
    .select("*")
    .single();

  if (error) {
    console.error("[b2b-pallet-producer-status] upsert:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save status" },
      { status: 500 },
    );
  }

  return NextResponse.json(saved);
}

export async function POST(request: NextRequest) {
  try {
    return await upsertProducerStatus(request);
  } catch (err) {
    console.error("[b2b-pallet-producer-status] POST:", err);
    return NextResponse.json({ error: "Failed to save status" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    return await upsertProducerStatus(request);
  } catch (err) {
    console.error("[b2b-pallet-producer-status] PATCH:", err);
    return NextResponse.json({ error: "Failed to save status" }, { status: 500 });
  }
}
