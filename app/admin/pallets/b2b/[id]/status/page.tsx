import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { B2B_PALLET_SHIPMENT_SELECT } from "@/lib/b2b-pallet-shipment-select";
import {
  formatSekFromCents,
  computePalletCostSummary,
  getPalletLineCost,
  collectCurrenciesNeedingRates,
} from "@/lib/b2b-wine-cost";
import { getAppUrl, getInternalFetchHeaders } from "@/lib/app-url";
import {
  ADMIN_OUTLINE_BUTTON_CLASS,
} from "@/lib/admin-form-styles";
import {
  emptyProducerStatus,
  getProducerProcessStep,
  isProducerConfirmed,
  summarizeB2bPalletProgress,
  type B2bPalletProducerStatusRow,
  type B2bPalletStatusProducerGroup,
} from "@/lib/b2b-pallet-producer-status";
import { formatProducerAddress } from "@/lib/b2b-pallet-pickup";
import { AdminB2bPalletStatusSummary } from "@/components/admin/b2b-pallet-status-summary";
import { B2bPalletOverviewCopyLinkButton } from "@/components/admin/b2b-pallet-overview-copy-link-button";
import { AdminB2bProducerStatusCard } from "@/components/admin/b2b-pallet-producer-status-card";
import { cn } from "@/lib/utils";

type ItemRow = {
  id: string;
  wine_id: string;
  quantity: number;
  created_at?: string | null;
  cost_cents_override?: number | null;
  wines?: {
    id: string;
    wine_name?: string | null;
    vintage?: string | null;
    cost_amount?: number | null;
    cost_currency?: string | null;
    exchange_rate?: number | null;
    alcohol_tax_cents?: number | null;
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
  cost_cents: number | null;
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

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function earliestIso(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

async function fetchExchangeRatesMap(
  currencies: string[],
): Promise<Record<string, number>> {
  const map: Record<string, number> = { SEK: 1 };
  const toFetch = [...new Set(currencies.filter((c) => c && c !== "SEK"))];
  if (toFetch.length === 0) return map;
  const base = getAppUrl();
  const headers = getInternalFetchHeaders();
  await Promise.all(
    toFetch.map(async (currency) => {
      try {
        const res = await fetch(
          `${base}/api/exchange-rates?from=${encodeURIComponent(currency)}&to=SEK`,
          { cache: "no-store", headers },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { rate?: number };
        if (data.rate != null && Number.isFinite(data.rate) && data.rate > 0) {
          map[currency] = data.rate;
        }
      } catch {
        /* keep fallback */
      }
    }),
  );
  return map;
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
      /** When this producer's wine(s) were first added to the pallet. */
      winesAddedAt: string | null;
      wines: Map<string, B2bPalletStatusProducerGroup["wines"][number]>;
    }
  >();

  for (const item of items) {
    const producer = item.wines?.producers;
    if (!producer?.id) continue;
    const existing = map.get(producer.id);
    const wineId = item.wines?.id ?? item.wine_id;
    const wineName = item.wines?.wine_name?.trim() || "Okänt vin";
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
        producerName: producer.name?.trim() || "Okänd producent",
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
      // Same fallback as producer Orders list: explicit send date, else when wines were added
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

export default async function B2BPalletStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = getSupabaseAdmin();

  const { data: shipment, error } = await sb
    .from("b2b_pallet_shipments")
    .select(B2B_PALLET_SHIPMENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !shipment) {
    notFound();
  }

  const row = shipment as unknown as ShipmentRow;

  const { data: statusRows } = await sb
    .from("b2b_pallet_producer_status")
    .select("*")
    .eq("shipment_id", id);

  const statusByProducer = new Map<string, B2bPalletProducerStatusRow>();
  for (const s of (statusRows ?? []) as B2bPalletProducerStatusRow[]) {
    statusByProducer.set(s.producer_id, {
      ...emptyProducerStatus(id, s.producer_id),
      ...s,
      producer_decision_status: s.producer_decision_status || "pending",
    });
  }

  const { data: wineStatusRows, error: wineStatusError } = await sb
    .from("b2b_pallet_producer_wine_status")
    .select(
      "wine_id, decision_status, confirmed_quantity, reject_reason, decided_at",
    )
    .eq("shipment_id", id);

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
          (ws.decision_status as
            | "pending"
            | "confirmed"
            | "declined") || "pending",
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
    id,
    items,
    statusByProducer,
    wineStatusByWineId,
  );

  const toneRank = (tone: ReturnType<typeof getProducerProcessStep>["tone"]) => {
    if (tone === "active") return 0;
    if (tone === "done") return 2;
    return 1;
  };

  const producersSorted = [...producers].sort((a, b) => {
    const toneA = getProducerProcessStep(a.status).tone;
    const toneB = getProducerProcessStep(b.status).tone;
    const rankDiff = toneRank(toneA) - toneRank(toneB);
    if (rankDiff !== 0) return rankDiff;
    return a.producerName.localeCompare(b.producerName, "sv");
  });

  const openProducers = producersSorted.filter(
    (p) => getProducerProcessStep(p.status).tone !== "done",
  );
  const doneProducers = producersSorted.filter(
    (p) => getProducerProcessStep(p.status).tone === "done",
  );

  const totalBottles = producers.reduce((sum, p) => sum + p.orderedQuantity, 0);
  const confirmedCount = producers.filter((p) => isProducerConfirmed(p.status)).length;
  const palletProgress = summarizeB2bPalletProgress(
    producers.map((p) => p.producerId),
    new Map(producers.map((p) => [p.producerId, p.status])),
    { shippedAt: row.shipped_at },
  );
  const wineCostFields = items.map((item) => ({
    quantity: Number(item.quantity) || 0,
    cost_cents_override:
      item.cost_cents_override != null ? Number(item.cost_cents_override) : null,
    wine: item.wines
      ? {
          cost_amount: item.wines.cost_amount ?? undefined,
          cost_currency: item.wines.cost_currency ?? undefined,
          exchange_rate: item.wines.exchange_rate ?? undefined,
          alcohol_tax_cents: item.wines.alcohol_tax_cents ?? undefined,
        }
      : undefined,
  }));
  const rateMap = await fetchExchangeRatesMap(
    collectCurrenciesNeedingRates(
      wineCostFields.map((line) => line.wine).filter(Boolean) as Array<{
        cost_currency?: string | null;
        exchange_rate?: number | null;
      }>,
    ),
  );
  const wineCostSummary = computePalletCostSummary(
    wineCostFields,
    row.cost_cents ?? 0,
    rateMap,
  );
  const invoiceTotalCents =
    palletProgress.invoiceTotalCents > 0
      ? palletProgress.invoiceTotalCents
      : wineCostSummary.wineTotalCents;
  const producerWineCostById = new Map<string, number>();
  for (const item of items) {
    const producerId = item.wines?.producers?.id;
    if (!producerId) continue;
    const line = getPalletLineCost(
      Number(item.quantity) || 0,
      item.cost_cents_override != null ? Number(item.cost_cents_override) : null,
      item.wines
        ? {
            cost_amount: item.wines.cost_amount ?? undefined,
            cost_currency: item.wines.cost_currency ?? undefined,
            exchange_rate: item.wines.exchange_rate ?? undefined,
            alcohol_tax_cents: item.wines.alcohol_tax_cents ?? undefined,
          }
        : undefined,
      rateMap,
    );
    producerWineCostById.set(
      producerId,
      (producerWineCostById.get(producerId) ?? 0) + line.lineTotalCents,
    );
  }
  const palletProducers = producersSorted.map((p) => {
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
    (row.pickup_producer_id ? "Okänd hub" : "Automatisk (20%-regeln)");
  const hubAddress = row.pickup_producer
    ? formatProducerAddress(row.pickup_producer)
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="mt-0.5 text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <Link href="/admin/pallets?tab=b2b">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {row.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {totalBottles} flaskor · {confirmedCount}/{producers.length} producenter
              bekräftade
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <B2bPalletOverviewCopyLinkButton shipmentId={id} />
          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "text-xs font-medium h-8")}
          >
            <Link href={`/admin/pallets/b2b/${id}/edit`}>Redigera pall</Link>
          </Button>
        </div>
      </header>

      <AdminB2bPalletStatusSummary
        shippedLabel={formatDate(row.shipped_at)}
        deliveredLabel={formatDate(row.delivered_at)}
        hubName={hubName}
        hubAddress={hubAddress}
        costLabel={
          row.cost_cents != null ? formatSekFromCents(row.cost_cents) : null
        }
        invoicePaidLabel={formatSekFromCents(palletProgress.invoicePaidCents)}
        invoiceTotalLabel={formatSekFromCents(invoiceTotalCents)}
        progress={palletProgress}
        producers={palletProducers}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {producersSorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-[#1F1F23] dark:text-zinc-400 lg:col-span-2">
            Inga viner på pallen — lägg till artiklar under Redigera.
          </div>
        ) : (
          <>
            {openProducers.map((group) => (
              <AdminB2bProducerStatusCard
                key={group.producerId}
                shipmentId={id}
                group={group}
                defaultInvoiceAmountCents={
                  producerWineCostById.get(group.producerId) ?? null
                }
              />
            ))}
            {doneProducers.length > 0 ? (
              <>
                <div className="col-span-full flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-[#1F1F23]" />
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Klara
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-[#1F1F23]" />
                </div>
                {doneProducers.map((group) => (
                  <AdminB2bProducerStatusCard
                    key={group.producerId}
                    shipmentId={id}
                    group={group}
                    defaultInvoiceAmountCents={
                      producerWineCostById.get(group.producerId) ?? null
                    }
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
