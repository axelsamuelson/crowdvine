import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { B2B_PALLET_SHIPMENT_SELECT } from "@/lib/b2b-pallet-shipment-select";
import { validateB2bPickupProducerId } from "@/lib/b2b-pallet-shipment-validation";
import { rollupWineDecisions } from "@/lib/b2b-pallet-producer-status";
import { b2bPalletStatusSchema } from "@/lib/b2b/pallet-status";
import {
  createB2bPalletAccessToken,
  createB2bPalletOverviewAccessToken,
} from "@/lib/b2b-pallet-access-tokens";
import { revalidateWineStorefrontCaches } from "@/lib/crowdvine/revalidate-wine-storefront";

export class B2bPalletValidationError extends Error {
  readonly status = 400 as const;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "B2bPalletValidationError";
    this.details = details;
  }
}

export type B2bPalletItemInput = {
  wine_id: string;
  quantity: number;
  quantity_sold?: number;
  cost_cents_override?: number | null;
};

export type CreateB2bPalletShipmentInput = {
  name: string;
  status?: unknown;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cost_cents?: number | null;
  pickup_producer_id?: string | null;
  is_new?: boolean;
  items?: B2bPalletItemInput[];
};

export type UpdateB2bPalletShipmentInput = {
  name?: string;
  status?: unknown;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cost_cents?: number | null;
  pickup_producer_id?: string | null;
  is_new?: boolean;
  items?: B2bPalletItemInput[];
};

export type UpdateB2bPalletShipmentItemPatch = {
  quantity?: number;
  quantity_sold?: number;
  cost_cents_override?: number | null;
};

function wineHandlesFromShipment(full: unknown): string[] {
  const items =
    (
      full as {
        b2b_pallet_shipment_items?: Array<{ wines?: { handle?: string } }>;
      } | null
    )?.b2b_pallet_shipment_items ?? [];
  return items
    .map((row) => row.wines?.handle)
    .filter((h): h is string => typeof h === "string" && h.length > 0);
}

async function fetchFullShipment(sb: SupabaseClient, id: string) {
  const { data, error } = await sb
    .from("b2b_pallet_shipments")
    .select(B2B_PALLET_SHIPMENT_SELECT)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createB2bPalletShipment(
  sb: SupabaseClient,
  input: CreateB2bPalletShipmentInput,
) {
  // Mirror admin POST: status must come from the body (no inactive default).
  const statusParsed = b2bPalletStatusSchema.safeParse(input.status);
  if (!statusParsed.success) {
    throw new B2bPalletValidationError("Invalid status");
  }
  if (!input.name?.trim()) {
    throw new B2bPalletValidationError("Name is required");
  }

  const items = input.items ?? [];
  const wineIds = items
    .filter((i) => i.wine_id && i.quantity > 0)
    .map((i) => i.wine_id);

  const pickupCheck = await validateB2bPickupProducerId(
    sb,
    input.pickup_producer_id,
    wineIds,
  );
  if (!pickupCheck.ok) {
    throw new B2bPalletValidationError(pickupCheck.error);
  }

  const { data: shipment, error: insertError } = await sb
    .from("b2b_pallet_shipments")
    .insert({
      name: input.name.trim(),
      shipped_at: input.shipped_at || null,
      delivered_at: input.delivered_at || null,
      cost_cents: input.cost_cents != null ? input.cost_cents : null,
      status: statusParsed.data,
      is_new: input.is_new === true,
      pickup_producer_id: pickupCheck.pickupProducerId,
    })
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);

  if (items.length > 0) {
    const itemRows = items
      .filter((i) => i.wine_id && i.quantity > 0)
      .map((i) => ({
        shipment_id: shipment.id,
        wine_id: i.wine_id,
        quantity: Math.max(1, Math.floor(i.quantity)),
        quantity_sold:
          i.quantity_sold != null
            ? Math.max(0, Math.floor(i.quantity_sold))
            : 0,
        cost_cents_override:
          i.cost_cents_override != null ? i.cost_cents_override : null,
      }));

    if (itemRows.length > 0) {
      const { error: itemsError } = await sb
        .from("b2b_pallet_shipment_items")
        .insert(itemRows);

      if (itemsError) {
        console.error("Error inserting shipment items:", itemsError);
        await sb.from("b2b_pallet_shipments").delete().eq("id", shipment.id);
        throw new Error(itemsError.message);
      }
    }
  }

  try {
    const full = await fetchFullShipment(sb, shipment.id as string);
    revalidateWineStorefrontCaches(wineHandlesFromShipment(full));
    return full;
  } catch {
    return shipment;
  }
}

export async function updateB2bPalletShipment(
  sb: SupabaseClient,
  id: string,
  body: UpdateB2bPalletShipmentInput,
) {
  const hasStatus = body.status !== undefined;
  const statusParsed = hasStatus
    ? b2bPalletStatusSchema.safeParse(body.status)
    : null;
  if (statusParsed && !statusParsed.success) {
    throw new B2bPalletValidationError("Invalid status");
  }

  let wineIdsForPickup: string[] = [];
  if (body.items && Array.isArray(body.items)) {
    wineIdsForPickup = body.items
      .filter((i) => i.wine_id && i.quantity > 0)
      .map((i) => i.wine_id);
  } else if (body.pickup_producer_id !== undefined) {
    const { data: existingItems } = await sb
      .from("b2b_pallet_shipment_items")
      .select("wine_id")
      .eq("shipment_id", id);
    wineIdsForPickup = (existingItems ?? []).map((row) => row.wine_id as string);
  }

  if (body.pickup_producer_id !== undefined) {
    const pickupCheck = await validateB2bPickupProducerId(
      sb,
      body.pickup_producer_id,
      wineIdsForPickup,
    );
    if (!pickupCheck.ok) {
      throw new B2bPalletValidationError(pickupCheck.error);
    }
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name?.trim();
  if (body.shipped_at !== undefined) {
    updateData.shipped_at = body.shipped_at || null;
  }
  if (body.delivered_at !== undefined) {
    updateData.delivered_at = body.delivered_at || null;
  }
  if (body.cost_cents !== undefined) {
    updateData.cost_cents = body.cost_cents != null ? body.cost_cents : null;
  }
  if (statusParsed?.success) updateData.status = statusParsed.data;
  if (typeof body.is_new === "boolean") updateData.is_new = body.is_new;
  if (body.pickup_producer_id !== undefined) {
    updateData.pickup_producer_id = body.pickup_producer_id || null;
  }
  updateData.updated_at = new Date().toISOString();

  if (Object.keys(updateData).length > 1) {
    const { error: updateError } = await sb
      .from("b2b_pallet_shipments")
      .update(updateData)
      .eq("id", id);

    if (updateError) throw new Error(updateError.message);
  }

  if (body.items && Array.isArray(body.items)) {
    let soldByWineId = new Map<string, number>();
    try {
      const { data: existingItems } = await sb
        .from("b2b_pallet_shipment_items")
        .select("wine_id, quantity_sold")
        .eq("shipment_id", id);
      (existingItems || []).forEach(
        (it: { wine_id: string; quantity_sold?: number }) => {
          soldByWineId.set(it.wine_id, it.quantity_sold ?? 0);
        },
      );
    } catch {
      /* quantity_sold column may not exist yet */
    }

    await sb.from("b2b_pallet_shipment_items").delete().eq("shipment_id", id);

    const validItems = body.items.filter((i) => i.wine_id && i.quantity > 0);
    if (validItems.length > 0) {
      const itemRows = validItems.map((i) => ({
        shipment_id: id,
        wine_id: i.wine_id,
        quantity: Math.max(1, Math.floor(i.quantity)),
        quantity_sold:
          i.quantity_sold != null
            ? Math.max(0, Math.floor(i.quantity_sold))
            : (soldByWineId.get(i.wine_id) ?? 0),
        cost_cents_override:
          i.cost_cents_override != null ? i.cost_cents_override : null,
      }));

      const { error: itemsError } = await sb
        .from("b2b_pallet_shipment_items")
        .insert(itemRows);

      if (itemsError) throw new Error(itemsError.message);
    }

    if (body.pickup_producer_id === undefined) {
      const { data: shipmentRow } = await sb
        .from("b2b_pallet_shipments")
        .select("pickup_producer_id")
        .eq("id", id)
        .maybeSingle();
      const currentPickup = shipmentRow?.pickup_producer_id as string | null;
      if (currentPickup) {
        const stillValid = await validateB2bPickupProducerId(
          sb,
          currentPickup,
          wineIdsForPickup,
        );
        if (stillValid.ok && stillValid.pickupProducerId === null) {
          await sb
            .from("b2b_pallet_shipments")
            .update({
              pickup_producer_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        }
      }
    }
  }

  const full = await fetchFullShipment(sb, id);
  revalidateWineStorefrontCaches(wineHandlesFromShipment(full));
  return full;
}

export async function deleteB2bPalletShipment(sb: SupabaseClient, id: string) {
  const { data: full } = await sb
    .from("b2b_pallet_shipments")
    .select(B2B_PALLET_SHIPMENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  const handles = wineHandlesFromShipment(full);

  const { error } = await sb.from("b2b_pallet_shipments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateWineStorefrontCaches(handles);
  return { success: true as const, id };
}

export async function updateB2bPalletShipmentItem(
  sb: SupabaseClient,
  id: string,
  patch: UpdateB2bPalletShipmentItemPatch,
) {
  const updateData: Record<string, unknown> = {};

  if (patch.quantity !== undefined) {
    updateData.quantity = Math.max(0, Math.floor(patch.quantity));
  }
  if (patch.quantity_sold !== undefined) {
    updateData.quantity_sold = Math.max(0, Math.floor(patch.quantity_sold));
  }
  if (patch.cost_cents_override !== undefined) {
    updateData.cost_cents_override = patch.cost_cents_override;
  }

  if (Object.keys(updateData).length === 0) {
    throw new B2bPalletValidationError("No fields to update");
  }

  const { data, error } = await sb
    .from("b2b_pallet_shipment_items")
    .update(updateData)
    .eq("id", id)
    .select("*, wines(handle)")
    .single();

  if (error) throw new Error(error.message);

  const handle = (data as { wines?: { handle?: string } } | null)?.wines?.handle;
  if (handle) revalidateWineStorefrontCaches([handle]);
  return data;
}

export async function addWineToB2bPalletShipment(
  sb: SupabaseClient,
  input: {
    pallet_id: string;
    wine_id: string;
    quantity: number;
    cost_cents_override?: number | null;
  },
) {
  const { data: shipment } = await sb
    .from("b2b_pallet_shipments")
    .select("id, pickup_producer_id")
    .eq("id", input.pallet_id)
    .maybeSingle();
  if (!shipment) {
    throw new B2bPalletValidationError("B2B pallet not found");
  }

  const { data: existingItems } = await sb
    .from("b2b_pallet_shipment_items")
    .select("wine_id")
    .eq("shipment_id", input.pallet_id);
  const wineIds = [
    ...(existingItems ?? []).map((r) => r.wine_id as string),
    input.wine_id,
  ];
  const pickupCheck = await validateB2bPickupProducerId(
    sb,
    shipment.pickup_producer_id,
    wineIds,
  );
  if (!pickupCheck.ok) {
    throw new B2bPalletValidationError(pickupCheck.error);
  }

  const { data, error } = await sb
    .from("b2b_pallet_shipment_items")
    .insert({
      shipment_id: input.pallet_id,
      wine_id: input.wine_id,
      quantity: Math.max(1, Math.floor(input.quantity)),
      quantity_sold: 0,
      cost_cents_override:
        input.cost_cents_override != null ? input.cost_cents_override : null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  try {
    const { data: wine } = await sb
      .from("wines")
      .select("handle")
      .eq("id", input.wine_id)
      .maybeSingle();
    if (wine?.handle) {
      revalidateWineStorefrontCaches([wine.handle as string]);
    }
  } catch {
    /* revalidate is best-effort */
  }

  return data;
}

// ── Producer status (schemas + upsert) ──────────────────────────────────────

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const nullableTimestamp = z.preprocess(emptyToNull, z.string().nullable());

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

export const b2bProducerWineDecisionSchema = z
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

export const upsertB2bProducerStatusSchema = z.object({
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
  wine_decisions: z.array(b2bProducerWineDecisionSchema).min(1).optional(),
});

export type UpsertB2bProducerStatusInput = z.infer<
  typeof upsertB2bProducerStatusSchema
>;

export async function upsertB2bProducerStatus(
  sb: SupabaseClient,
  rawInput: UpsertB2bProducerStatusInput | unknown,
  updatedBy: string,
) {
  const parsed = upsertB2bProducerStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new B2bPalletValidationError(
      "Validation failed",
      parsed.error.flatten(),
    );
  }

  const data = parsed.data;
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
      throw new Error(itemsError.message || "Kunde inte läsa viner");
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
        throw new B2bPalletValidationError(
          `Vin ${d.wine_id} tillhör inte denna producent på pallen`,
        );
      }
    }

    if (data.wine_decisions.length !== allowedWineIds.size) {
      throw new B2bPalletValidationError(
        "Ange beslut för varje vin på pallen för producenten",
      );
    }
    const decidedIds = new Set(data.wine_decisions.map((d) => d.wine_id));
    for (const wineId of allowedWineIds) {
      if (!decidedIds.has(wineId)) {
        throw new B2bPalletValidationError(
          "Ange beslut för varje vin på pallen för producenten",
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
        updated_by: updatedBy,
      };
    });

    const { error: wineError } = await sb
      .from("b2b_pallet_producer_wine_status")
      .upsert(wineRows, { onConflict: "shipment_id,wine_id" });

    if (wineError) {
      throw new Error(
        wineError.message ||
          "Kunde inte spara vinbeslut (kör migration 193?)",
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
        updated_by: updatedBy,
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
    updated_by: updatedBy,
  };

  const { data: saved, error } = await sb
    .from("b2b_pallet_producer_status")
    .upsert(row, { onConflict: "shipment_id,producer_id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message || "Failed to save status");
  return saved;
}

// ── Replace producer wines ──────────────────────────────────────────────────

export const replaceB2bProducerWinesSchema = z.object({
  producer_id: z.string().uuid(),
  items: z.array(
    z.object({
      wine_id: z.string().uuid(),
      quantity: z.number().int().positive(),
    }),
  ),
});

export type ReplaceB2bProducerWinesInput = z.infer<
  typeof replaceB2bProducerWinesSchema
>;

export async function replaceB2bProducerWines(
  sb: SupabaseClient,
  shipmentId: string,
  rawInput: ReplaceB2bProducerWinesInput | unknown,
) {
  const parsed = replaceB2bProducerWinesSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new B2bPalletValidationError(
      "Validation failed",
      parsed.error.flatten(),
    );
  }

  const { producer_id: producerId, items } = parsed.data;

  const { data: shipment, error: shipmentError } = await sb
    .from("b2b_pallet_shipments")
    .select("id")
    .eq("id", shipmentId)
    .maybeSingle();

  if (shipmentError) throw new Error(shipmentError.message);
  if (!shipment) {
    throw new B2bPalletValidationError("Pall hittades inte");
  }

  const wineIds = items.map((i) => i.wine_id);
  if (wineIds.length > 0) {
    const { data: wines, error: winesError } = await sb
      .from("wines")
      .select("id, producer_id")
      .in("id", wineIds);

    if (winesError) throw new Error(winesError.message);

    const byId = new Map(
      (wines ?? []).map((w) => [w.id as string, w.producer_id as string]),
    );
    for (const wineId of wineIds) {
      const pid = byId.get(wineId);
      if (!pid) {
        throw new B2bPalletValidationError(`Vin ${wineId} hittades inte`);
      }
      if (pid !== producerId) {
        throw new B2bPalletValidationError(
          "Alla viner måste tillhöra den valda producenten",
        );
      }
    }
  }

  const { data: existingItems, error: existingError } = await sb
    .from("b2b_pallet_shipment_items")
    .select(
      "id, wine_id, quantity, quantity_sold, cost_cents_override, wines!inner(producer_id)",
    )
    .eq("shipment_id", shipmentId)
    .eq("wines.producer_id", producerId);

  if (existingError) throw new Error(existingError.message);

  const existingByWine = new Map<
    string,
    {
      id: string;
      quantity_sold: number;
      cost_cents_override: number | null;
    }
  >();
  for (const row of existingItems ?? []) {
    existingByWine.set(row.wine_id as string, {
      id: row.id as string,
      quantity_sold: Number(row.quantity_sold) || 0,
      cost_cents_override:
        row.cost_cents_override != null
          ? Number(row.cost_cents_override)
          : null,
    });
  }

  const nextWineIds = new Set(wineIds);
  const toDeleteIds = Array.from(existingByWine.entries())
    .filter(([wineId]) => !nextWineIds.has(wineId))
    .map(([, row]) => row.id);

  if (toDeleteIds.length > 0) {
    const { error: deleteError } = await sb
      .from("b2b_pallet_shipment_items")
      .delete()
      .in("id", toDeleteIds);
    if (deleteError) throw new Error(deleteError.message);
  }

  const removedWineIds = Array.from(existingByWine.keys()).filter(
    (wineId) => !nextWineIds.has(wineId),
  );
  if (removedWineIds.length > 0) {
    await sb
      .from("b2b_pallet_producer_wine_status")
      .delete()
      .eq("shipment_id", shipmentId)
      .in("wine_id", removedWineIds);
  }

  for (const item of items) {
    const existing = existingByWine.get(item.wine_id);
    const quantity = Math.max(1, Math.floor(item.quantity));
    if (existing) {
      const { error: updateError } = await sb
        .from("b2b_pallet_shipment_items")
        .update({ quantity })
        .eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await sb
        .from("b2b_pallet_shipment_items")
        .insert({
          shipment_id: shipmentId,
          wine_id: item.wine_id,
          quantity,
          quantity_sold: 0,
          cost_cents_override: null,
        });
      if (insertError) throw new Error(insertError.message);
    }
  }

  try {
    return await fetchFullShipment(sb, shipmentId);
  } catch {
    return { success: true as const, id: shipmentId };
  }
}

// ── Share-link thin wrappers ────────────────────────────────────────────────

export async function createB2bShareLink(opts: {
  shipmentId: string;
  createdBy?: string | null;
  origin: string;
}) {
  return createB2bPalletOverviewAccessToken(opts);
}

export async function createB2bProducerShareLink(opts: {
  shipmentId: string;
  producerId: string;
  createdBy?: string | null;
  origin: string;
}) {
  return createB2bPalletAccessToken(opts);
}

/** @deprecated Prefer createB2bShareLink */
export const createB2bShareLinkCore = createB2bShareLink;
/** @deprecated Prefer createB2bProducerShareLink */
export const createB2bProducerShareLinkCore = createB2bProducerShareLink;

/** Map core write errors to NextResponse-friendly status + body. */
export function b2bPalletWriteHttpError(error: unknown): {
  status: number;
  body: Record<string, unknown>;
} {
  if (error instanceof B2bPalletValidationError) {
    const body: Record<string, unknown> = { error: error.message };
    if (error.details !== undefined) body.details = error.details;
    if (
      error.message === "Pall hittades inte" ||
      /not found/i.test(error.message)
    ) {
      return { status: 404, body };
    }
    return { status: 400, body };
  }
  const message = error instanceof Error ? error.message : "Failed";
  if (/not found|no wines/i.test(message)) {
    return { status: 404, body: { error: message } };
  }
  // Plain Error from validation messages in cores that throw new Error(...)
  if (
    message === "Invalid status" ||
    message === "Name is required" ||
    message === "No fields to update" ||
    message === "Validation failed"
  ) {
    return { status: 400, body: { error: message } };
  }
  return { status: 500, body: { error: message } };
}
