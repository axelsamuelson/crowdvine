import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { B2B_PALLET_SHIPMENT_SELECT } from "@/lib/b2b-pallet-shipment-select";
import { formatProducerAddress } from "@/lib/b2b-pallet-pickup";
import {
  emptyProducerStatus,
  getProducerProcessStep,
  summarizeB2bPalletProgress,
  type B2bPalletProducerProgressRow,
  type B2bPalletProducerStatusRow,
  type B2bPalletProgressSummary,
  type B2bPalletStatusProducerGroup,
} from "@/lib/b2b-pallet-producer-status";

type ItemRow = {
  id: string;
  wine_id: string;
  quantity: number;
  created_at?: string | null;
  wines?: {
    id: string;
    wine_name?: string | null;
    vintage?: string | null;
    producers?: {
      id: string;
      name?: string | null;
    } | null;
  } | null;
};

type ShipmentRow = {
  id: string;
  name: string;
  shipped_at: string | null;
  delivered_at: string | null;
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
  b2b_pallet_shipment_items?: ItemRow[] | null;
};

function earliestIso(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

function groupProducers(
  shipmentId: string,
  items: ItemRow[],
  statusByProducer: Map<string, B2bPalletProducerStatusRow>,
  wineStatusByWineId: Map<
    string,
    {
      decisionStatus: B2bPalletStatusProducerGroup["wines"][number]["decisionStatus"];
      confirmedQuantity: number | null;
      rejectReason: string | null;
      decidedAt: string | null;
    }
  >,
): B2bPalletStatusProducerGroup[] {
  const map = new Map<
    string,
    {
      producerId: string;
      producerName: string;
      orderedQuantity: number;
      winesAddedAt: string | null;
      wines: Map<string, B2bPalletStatusProducerGroup["wines"][number]>;
    }
  >();

  for (const item of items) {
    const producer = item.wines?.producers;
    if (!producer?.id) continue;
    const existing = map.get(producer.id);
    const wineId = item.wines?.id ?? item.wine_id;
    const wineName = item.wines?.wine_name?.trim() || "Unknown wine";
    const vintage = item.wines?.vintage ?? null;
    const qty = Number(item.quantity) || 0;
    const itemCreatedAt = item.created_at ?? null;
    const wineDecision = wineStatusByWineId.get(wineId);

    if (!existing) {
      const wines = new Map();
      wines.set(wineId, {
        wineId,
        wineName,
        vintage,
        quantity: qty,
        decisionStatus: wineDecision?.decisionStatus ?? "pending",
        confirmedQuantity: wineDecision?.confirmedQuantity ?? null,
        rejectReason: wineDecision?.rejectReason ?? null,
        decidedAt: wineDecision?.decidedAt ?? null,
      });
      map.set(producer.id, {
        producerId: producer.id,
        producerName: producer.name?.trim() || "Unknown producer",
        orderedQuantity: qty,
        winesAddedAt: itemCreatedAt,
        wines,
      });
    } else {
      existing.orderedQuantity += qty;
      existing.winesAddedAt = earliestIso(existing.winesAddedAt, itemCreatedAt);
      const wine = existing.wines.get(wineId);
      if (wine) wine.quantity += qty;
      else {
        existing.wines.set(wineId, {
          wineId,
          wineName,
          vintage,
          quantity: qty,
          decisionStatus: wineDecision?.decisionStatus ?? "pending",
          confirmedQuantity: wineDecision?.confirmedQuantity ?? null,
          rejectReason: wineDecision?.rejectReason ?? null,
          decidedAt: wineDecision?.decidedAt ?? null,
        });
      }
    }
  }

  return Array.from(map.values())
    .map((g) => {
      const stored =
        statusByProducer.get(g.producerId) ??
        emptyProducerStatus(shipmentId, g.producerId);
      return {
        producerId: g.producerId,
        producerName: g.producerName,
        orderedQuantity: g.orderedQuantity,
        wines: Array.from(g.wines.values()).sort((a, b) =>
          a.wineName.localeCompare(b.wineName, "sv"),
        ),
        status: {
          ...stored,
          order_sent_at: stored.order_sent_at ?? g.winesAddedAt,
        },
      };
    })
    .sort((a, b) => a.producerName.localeCompare(b.producerName, "sv"));
}

export type B2bPalletStatusOverview = {
  shipmentId: string;
  name: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  hubName: string;
  hubAddress: string | null;
  totalBottles: number;
  producers: B2bPalletStatusProducerGroup[];
  progress: B2bPalletProgressSummary;
  progressProducers: B2bPalletProducerProgressRow[];
};

/** Load whole-pallet status for shared/public overview (no admin notes / cost). */
export async function loadB2bPalletStatusOverview(
  shipmentId: string,
): Promise<B2bPalletStatusOverview | null> {
  const sb = getSupabaseAdmin();

  const { data: shipment, error } = await sb
    .from("b2b_pallet_shipments")
    .select(B2B_PALLET_SHIPMENT_SELECT)
    .eq("id", shipmentId)
    .maybeSingle();

  if (error || !shipment) return null;

  const row = shipment as unknown as ShipmentRow;

  const { data: statusRows } = await sb
    .from("b2b_pallet_producer_status")
    .select("*")
    .eq("shipment_id", shipmentId);

  const statusByProducer = new Map<string, B2bPalletProducerStatusRow>();
  for (const s of (statusRows ?? []) as B2bPalletProducerStatusRow[]) {
    statusByProducer.set(s.producer_id, {
      ...emptyProducerStatus(shipmentId, s.producer_id),
      ...s,
      producer_decision_status: s.producer_decision_status || "pending",
    });
  }

  const { data: wineStatusRows, error: wineStatusError } = await sb
    .from("b2b_pallet_producer_wine_status")
    .select(
      "wine_id, decision_status, confirmed_quantity, reject_reason, decided_at",
    )
    .eq("shipment_id", shipmentId);

  const wineStatusByWineId = new Map<
    string,
    {
      decisionStatus: B2bPalletStatusProducerGroup["wines"][number]["decisionStatus"];
      confirmedQuantity: number | null;
      rejectReason: string | null;
      decidedAt: string | null;
    }
  >();
  if (!wineStatusError) {
    for (const ws of wineStatusRows ?? []) {
      wineStatusByWineId.set(ws.wine_id as string, {
        decisionStatus:
          (ws.decision_status as "pending" | "confirmed" | "declined") ||
          "pending",
        confirmedQuantity:
          ws.confirmed_quantity != null ? Number(ws.confirmed_quantity) : null,
        rejectReason:
          typeof ws.reject_reason === "string" ? ws.reject_reason : null,
        decidedAt: typeof ws.decided_at === "string" ? ws.decided_at : null,
      });
    }
  }

  const items = row.b2b_pallet_shipment_items ?? [];
  const producers = groupProducers(
    shipmentId,
    items,
    statusByProducer,
    wineStatusByWineId,
  );
  const totalBottles = producers.reduce((sum, p) => sum + p.orderedQuantity, 0);
  const progress = summarizeB2bPalletProgress(
    producers.map((p) => p.producerId),
    new Map(producers.map((p) => [p.producerId, p.status])),
    { shippedAt: row.shipped_at },
  );
  const progressProducers = producers.map((p) => {
    const step = getProducerProcessStep(p.status);
    return {
      producerId: p.producerId,
      producerName: p.producerName,
      bottleCount: p.orderedQuantity,
      stepLabel: step.label,
      stepTone: step.tone,
    };
  });

  const hubName =
    row.pickup_producer?.name?.trim() ||
    (row.pickup_producer_id ? "Unknown hub" : "Automatic (20% rule)");
  const hubAddress = row.pickup_producer
    ? formatProducerAddress(row.pickup_producer)
    : null;

  return {
    shipmentId: row.id,
    name: row.name,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    hubName,
    hubAddress,
    totalBottles,
    producers,
    progress,
    progressProducers,
  };
}
