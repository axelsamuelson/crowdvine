import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { formatProducerAddress } from "@/lib/b2b-pallet-pickup";
import {
  emptyProducerStatus,
  getProducerProcessStep,
  summarizeB2bPalletProgress,
  type B2bPalletProducerProgressRow,
  type B2bPalletProducerStatusRow,
  type B2bPalletProgressSummary,
  type B2bPalletStatusWine,
} from "@/lib/b2b-pallet-producer-status";

export type ProducerB2bPalletListItem = {
  shipmentId: string;
  name: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  isActive: boolean;
  createdAt: string | null;
  bottleCount: number;
  wineNames: string[];
  decisionStatus: B2bPalletProducerStatusRow["producer_decision_status"];
  /** Current process step (Order sent → Confirmed → Hub Delivery). */
  processStepLabel: string;
  processStepTone: "pending" | "active" | "done" | "rejected";
};

export type ProducerB2bPalletDetail = {
  shipmentId: string;
  name: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  hubName: string | null;
  hubAddress: string | null;
  orderedQuantity: number;
  wines: B2bPalletStatusWine[];
  /** Pallet-wide producer progress (anonymous counts). */
  palletProgress: B2bPalletProgressSummary;
  /** All producers on this pallet with current process step. */
  palletProducers: B2bPalletProducerProgressRow[];
  /** admin_note intentionally omitted */
  status: Omit<B2bPalletProducerStatusRow, "admin_note">;
};

type ItemJoin = {
  quantity: number | null;
  wine_id: string;
  created_at: string | null;
  wines: {
    id: string;
    wine_name: string | null;
    vintage: string | null;
    producer_id: string;
  } | null;
  b2b_pallet_shipments: {
    id: string;
    name: string;
    shipped_at: string | null;
    delivered_at: string | null;
    is_active: boolean | null;
    created_at: string | null;
    pickup_producer_id: string | null;
    pickup_producer?: {
      id: string;
      name: string | null;
      address_street?: string | null;
      address_city?: string | null;
      address_postcode?: string | null;
      region?: string | null;
      subregion?: string | null;
    } | null;
  } | null;
};

/** Shipments that include at least one wine for this producer. */
export async function listProducerB2bPallets(
  producerId: string,
): Promise<ProducerB2bPalletListItem[]> {
  const sb = getSupabaseAdmin();

  const { data: items, error } = await sb
    .from("b2b_pallet_shipment_items")
    .select(
      `
      quantity,
      wine_id,
      created_at,
      wines!inner(
        id,
        wine_name,
        vintage,
        producer_id
      ),
      b2b_pallet_shipments!inner(
        id,
        name,
        shipped_at,
        delivered_at,
        is_active,
        created_at
      )
    `,
    )
    .eq("wines.producer_id", producerId);

  if (error) {
    throw new Error(error.message);
  }

  const byShipment = new Map<
    string,
    {
      name: string;
      shippedAt: string | null;
      deliveredAt: string | null;
      isActive: boolean;
      /** Earliest time this producer's wine(s) were added to the pallet. */
      winesAddedAt: string | null;
      bottleCount: number;
      wineNames: Set<string>;
    }
  >();

  for (const raw of (items ?? []) as unknown as ItemJoin[]) {
    const shipment = raw.b2b_pallet_shipments;
    const wine = raw.wines;
    if (!shipment?.id || !wine) continue;
    const qty = Number(raw.quantity) || 0;
    const label = wine.vintage
      ? `${wine.wine_name ?? "Wine"} ${wine.vintage}`
      : wine.wine_name ?? "Wine";
    const itemCreatedAt = raw.created_at;

    const existing = byShipment.get(shipment.id);
    if (!existing) {
      byShipment.set(shipment.id, {
        name: shipment.name,
        shippedAt: shipment.shipped_at,
        deliveredAt: shipment.delivered_at,
        isActive: shipment.is_active === true,
        winesAddedAt: itemCreatedAt,
        bottleCount: qty,
        wineNames: new Set([label]),
      });
    } else {
      existing.bottleCount += qty;
      existing.wineNames.add(label);
      // Keep earliest add date for this producer on the pallet
      if (itemCreatedAt) {
        const prev = existing.winesAddedAt
          ? new Date(existing.winesAddedAt).getTime()
          : Number.POSITIVE_INFINITY;
        const next = new Date(itemCreatedAt).getTime();
        if (next < prev) existing.winesAddedAt = itemCreatedAt;
      }
    }
  }

  const shipmentIds = Array.from(byShipment.keys());
  const statusByShipment = new Map<string, B2bPalletProducerStatusRow>();

  if (shipmentIds.length > 0) {
    const { data: statuses } = await sb
      .from("b2b_pallet_producer_status")
      .select(
        "shipment_id, producer_id, producer_decision_status, order_sent_at, producer_decided_at, confirmed_quantity, pickup_date, pickup_date_confirmed_at, goods_ready_at, delivered_to_hub_at, invoice_received_at, invoice_paid_at, invoice_amount_cents, blocked_reason, producer_note, updated_at",
      )
      .eq("producer_id", producerId)
      .in("shipment_id", shipmentIds);

    for (const s of (statuses ?? []) as B2bPalletProducerStatusRow[]) {
      statusByShipment.set(s.shipment_id, s);
    }
  }

  return Array.from(byShipment.entries())
    .map(([shipmentId, g]) => {
      const status = statusByShipment.get(shipmentId);
      // Prefer when order was sent to producer; else when wines were added to the pallet
      const orderDate = status?.order_sent_at ?? g.winesAddedAt;
      const step = getProducerProcessStep({
        order_sent_at: status?.order_sent_at ?? g.winesAddedAt ?? "on-pallet",
        producer_decision_status: status?.producer_decision_status ?? "pending",
        delivered_to_hub_at: status?.delivered_to_hub_at ?? null,
      });
      return {
        shipmentId,
        name: g.name,
        shippedAt: g.shippedAt,
        deliveredAt: g.deliveredAt,
        isActive: g.isActive,
        createdAt: orderDate,
        bottleCount: g.bottleCount,
        wineNames: Array.from(g.wineNames).sort((a, b) =>
          a.localeCompare(b, "sv"),
        ),
        decisionStatus: status?.producer_decision_status ?? "pending",
        processStepLabel: step.label,
        processStepTone: step.tone,
      };
    })
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
}

/** Detail for one shipment, scoped to this producer. Null if no wines on pallet. */
export async function getProducerB2bPalletDetail(
  producerId: string,
  shipmentId: string,
): Promise<ProducerB2bPalletDetail | null> {
  const sb = getSupabaseAdmin();

  const { data: items, error } = await sb
    .from("b2b_pallet_shipment_items")
    .select(
      `
      quantity,
      wine_id,
      created_at,
      wines!inner(
        id,
        wine_name,
        vintage,
        producer_id
      ),
      b2b_pallet_shipments!inner(
        id,
        name,
        shipped_at,
        delivered_at,
        is_active,
        created_at,
        pickup_producer_id,
        pickup_producer:producers!pickup_producer_id(
          id,
          name,
          address_street,
          address_city,
          address_postcode,
          region,
          subregion
        )
      )
    `,
    )
    .eq("shipment_id", shipmentId)
    .eq("wines.producer_id", producerId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (items ?? []) as unknown as ItemJoin[];
  if (rows.length === 0) return null;

  const shipment = rows[0].b2b_pallet_shipments;
  if (!shipment) return null;

  const wineMap = new Map<string, B2bPalletStatusWine>();
  let orderedQuantity = 0;
  let winesAddedAt: string | null = null;
  for (const row of rows) {
    const wine = row.wines;
    if (!wine) continue;
    const qty = Number(row.quantity) || 0;
    orderedQuantity += qty;
    if (row.created_at) {
      const prev = winesAddedAt
        ? new Date(winesAddedAt).getTime()
        : Number.POSITIVE_INFINITY;
      const next = new Date(row.created_at).getTime();
      if (next < prev) winesAddedAt = row.created_at;
    }
    const existing = wineMap.get(wine.id);
    if (existing) existing.quantity += qty;
    else {
      wineMap.set(wine.id, {
        wineId: wine.id,
        wineName: wine.wine_name?.trim() || "Wine",
        vintage: wine.vintage,
        quantity: qty,
        decisionStatus: "pending",
        confirmedQuantity: null,
        rejectReason: null,
        decidedAt: null,
      });
    }
  }

  const { data: statusRow } = await sb
    .from("b2b_pallet_producer_status")
    .select(
      "id, shipment_id, producer_id, order_sent_at, producer_decision_status, producer_decided_at, confirmed_quantity, pickup_date, pickup_date_confirmed_at, goods_ready_at, delivered_to_hub_at, invoice_received_at, invoice_paid_at, invoice_amount_cents, blocked_reason, producer_note, updated_at, created_at",
    )
    .eq("shipment_id", shipmentId)
    .eq("producer_id", producerId)
    .maybeSingle();

  const wineIds = Array.from(wineMap.keys());
  if (wineIds.length > 0) {
    const { data: wineStatuses, error: wineStatusError } = await sb
      .from("b2b_pallet_producer_wine_status")
      .select(
        "wine_id, decision_status, confirmed_quantity, reject_reason, decided_at",
      )
      .eq("shipment_id", shipmentId)
      .eq("producer_id", producerId)
      .in("wine_id", wineIds);

    if (!wineStatusError) {
      for (const ws of wineStatuses ?? []) {
        const wine = wineMap.get(ws.wine_id as string);
        if (!wine) continue;
        const status =
          (ws.decision_status as B2bPalletStatusWine["decisionStatus"]) ||
          "pending";
        wine.decisionStatus = status;
        wine.confirmedQuantity =
          ws.confirmed_quantity != null ? Number(ws.confirmed_quantity) : null;
        wine.rejectReason =
          typeof ws.reject_reason === "string" ? ws.reject_reason : null;
        wine.decidedAt =
          typeof ws.decided_at === "string" ? ws.decided_at : null;
      }
    }
  }

  // Fallback for legacy producer-level decisions without per-wine rows
  const legacyDecision =
    (statusRow as B2bPalletProducerStatusRow | null)?.producer_decision_status;
  if (legacyDecision === "confirmed" || legacyDecision === "declined") {
    for (const wine of wineMap.values()) {
      if (wine.decisionStatus !== "pending") continue;
      wine.decisionStatus = legacyDecision;
      wine.confirmedQuantity =
        legacyDecision === "confirmed" ? wine.quantity : 0;
      wine.decidedAt =
        (statusRow as B2bPalletProducerStatusRow | null)?.producer_decided_at ??
        null;
    }
  }

  // Pallet-wide progress: all producers with wines on this shipment
  const { data: allItems } = await sb
    .from("b2b_pallet_shipment_items")
    .select(
      `
      quantity,
      wines!inner(
        producer_id,
        producers!inner(id, name)
      )
    `,
    )
    .eq("shipment_id", shipmentId);

  const bottlesByProducer = new Map<
    string,
    { name: string; bottleCount: number }
  >();
  for (const row of allItems ?? []) {
    const wine = row.wines as
      | {
          producer_id?: string;
          producers?:
            | { id?: string; name?: string | null }
            | { id?: string; name?: string | null }[]
            | null;
        }
      | null;
    if (!wine?.producer_id) continue;
    const producerEmbed = Array.isArray(wine.producers)
      ? wine.producers[0]
      : wine.producers;
    const name = producerEmbed?.name?.trim() || "Producer";
    const qty = Number(row.quantity) || 0;
    const existing = bottlesByProducer.get(wine.producer_id);
    if (existing) existing.bottleCount += qty;
    else bottlesByProducer.set(wine.producer_id, { name, bottleCount: qty });
  }

  const allProducerIds = Array.from(bottlesByProducer.keys());

  const { data: allStatuses } = await sb
    .from("b2b_pallet_producer_status")
    .select(
      "shipment_id, producer_id, order_sent_at, producer_decision_status, producer_decided_at, confirmed_quantity, pickup_date, pickup_date_confirmed_at, goods_ready_at, delivered_to_hub_at, invoice_received_at, invoice_paid_at, invoice_amount_cents, blocked_reason, producer_note, updated_at",
    )
    .eq("shipment_id", shipmentId);

  const statusByProducer = new Map<string, B2bPalletProducerStatusRow>();
  for (const row of (allStatuses ?? []) as B2bPalletProducerStatusRow[]) {
    statusByProducer.set(row.producer_id, row);
  }
  const palletProgress = summarizeB2bPalletProgress(
    allProducerIds,
    statusByProducer,
    { shippedAt: shipment.shipped_at },
  );

  const palletProducers: B2bPalletProducerProgressRow[] = Array.from(
    bottlesByProducer.entries(),
  )
    .map(([pid, info]) => {
      const stored = statusByProducer.get(pid);
      const step = getProducerProcessStep({
        order_sent_at: stored?.order_sent_at ?? "on-pallet",
        producer_decision_status: stored?.producer_decision_status ?? "pending",
        delivered_to_hub_at: stored?.delivered_to_hub_at ?? null,
      });
      return {
        producerId: pid,
        producerName: info.name,
        bottleCount: info.bottleCount,
        stepLabel: step.label,
        stepTone: step.tone,
      };
    })
    .sort((a, b) => a.producerName.localeCompare(b.producerName, "sv"));

  const stored = statusRow as B2bPalletProducerStatusRow | null;
  const base = emptyProducerStatus(shipmentId, producerId);
  const mergedStatus = {
    ...base,
    ...(stored as Partial<B2bPalletProducerStatusRow> | null),
    shipment_id: shipmentId,
    producer_id: producerId,
    // Same fallback as Orders list: explicit send date, else when wines were added
    order_sent_at: stored?.order_sent_at ?? winesAddedAt,
    producer_decision_status: stored?.producer_decision_status || "pending",
    admin_note: null as null,
  };
  // Never expose admin_note to producer portal
  const { admin_note: _adminNote, ...safeStatus } = mergedStatus;

  return {
    shipmentId: shipment.id,
    name: shipment.name,
    shippedAt: shipment.shipped_at,
    deliveredAt: shipment.delivered_at,
    hubName: shipment.pickup_producer?.name?.trim() || null,
    hubAddress: shipment.pickup_producer
      ? formatProducerAddress(shipment.pickup_producer)
      : null,
    orderedQuantity,
    wines: Array.from(wineMap.values()).sort((a, b) =>
      a.wineName.localeCompare(b.wineName, "sv"),
    ),
    palletProgress,
    palletProducers,
    status: safeStatus,
  };
}

/** True if this producer has at least one item on the shipment. */
export async function producerHasWinesOnShipment(
  producerId: string,
  shipmentId: string,
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("b2b_pallet_shipment_items")
    .select("id, wines!inner(producer_id)")
    .eq("shipment_id", shipmentId)
    .eq("wines.producer_id", producerId)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
