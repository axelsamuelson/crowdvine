/**
 * Server-side Finance aggregation (admin). Uses service-role after requireAdmin().
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";
import { resolveFreightTargetCents } from "@/lib/pallet-contribution";
import { inboundFreightCentsPerBottle } from "@/lib/finance/margins";
import { aggregatePactActuals } from "@/lib/finance/pact-actuals";
import { aggregateDirtywineActuals } from "@/lib/finance/dirtywine-actuals";
import {
  allocateOpexByChannel,
  calculateBreakEven,
  type FinanceOpexEntry,
} from "@/lib/finance/opex";
import {
  classifyShippingRevenueOnSnapshot,
  summarizeShippingAudit,
} from "@/lib/finance/shipping-audit";
import type { FinanceBreakdown, FinanceChannel } from "@/lib/finance/types";
import type { InvoiceData } from "@/types/invoice";
import { buildFinanceBreakdown } from "@/lib/finance/margins";

function mapOpexRow(r: Record<string, unknown>): FinanceOpexEntry {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    category: String(r.category ?? "other"),
    amountCents: Math.round(Number(r.amount_cents) || 0),
    currency: "SEK",
    cadence: r.cadence as FinanceOpexEntry["cadence"],
    channel: r.channel as FinanceOpexEntry["channel"],
    sharedPactPercent:
      r.shared_pact_percent == null ? null : Number(r.shared_pact_percent),
    startsOn: String(r.starts_on).slice(0, 10),
    endsOn: r.ends_on ? String(r.ends_on).slice(0, 10) : null,
    active: r.active !== false,
    notes: r.notes != null ? String(r.notes) : null,
  };
}

export async function loadFinanceOpexEntries(): Promise<FinanceOpexEntry[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("finance_opex_entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    // Table may not exist yet in local envs without migration applied
    console.error("[finance] opex load:", error.message);
    return [];
  }
  return (data ?? []).map((r) => mapOpexRow(r as Record<string, unknown>));
}

export async function loadPactFinanceOverview(input: {
  start: Date;
  end: Date;
  opexAllocatedCents: number;
  /** Forecast ship qty for open-pallet GM3; null = no inbound allocation. */
  forecastShipQty?: number | null;
}): Promise<{
  breakdown: FinanceBreakdown;
  wineRows: Array<{
    wineId: string;
    bottles: number;
    productNetCents: number;
    gm1Cents: number;
    gm2Cents: number;
    completeness: string;
  }>;
  shippingAudit: ReturnType<typeof summarizeShippingAudit>;
}> {
  const sb = getSupabaseAdmin();
  const startIso = input.start.toISOString();
  const endIso = input.end.toISOString();

  const { data: reservations, error: resErr } = await sb
    .from("order_reservations")
    .select("id, created_at, total_sek, shipping_revenue_gross_cents, pallet_id, status")
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .in("status", [...PALLET_FILL_STATUSES]);

  if (resErr) throw new Error(resErr.message);

  const reservationIds = (reservations ?? [])
    .map((r) => r.id)
    .filter((id): id is string => typeof id === "string");

  if (reservationIds.length === 0) {
    return {
      breakdown: aggregatePactActuals({
        rows: [],
        orderCount: 0,
        opexAllocatedCents: input.opexAllocatedCents,
      }),
      wineRows: [],
      shippingAudit: summarizeShippingAudit([]),
    };
  }

  // Batch items
  const { data: items, error: itemsErr } = await sb
    .from("order_reservation_items")
    .select("id, reservation_id, item_id, quantity, economics_snapshot")
    .in("reservation_id", reservationIds);

  if (itemsErr) throw new Error(itemsErr.message);

  const rows = (items ?? []).map((i) => ({
    quantity: i.quantity,
    economics_snapshot: i.economics_snapshot,
    reservation_id: i.reservation_id as string,
  }));

  // Shipping audit (read-only)
  const resById = new Map(
    (reservations ?? []).map((r) => [r.id as string, r]),
  );
  const auditRows = (items ?? []).map((i) => {
    const res = resById.get(i.reservation_id as string);
    return classifyShippingRevenueOnSnapshot({
      reservationItemId: String(i.id),
      reservationId: String(i.reservation_id),
      quantity: Number(i.quantity) || 0,
      economicsSnapshot: i.economics_snapshot,
      reservationShippingGrossCents:
        res?.shipping_revenue_gross_cents != null
          ? Number(res.shipping_revenue_gross_cents)
          : null,
      reservationTotalSek:
        res?.total_sek != null ? Number(res.total_sek) : null,
    });
  });

  // Optional forecast inbound: average selected freight across pallets in set
  let inboundCents = 0;
  let inboundKind: FinanceBreakdown["inboundAllocationKind"] = "none";
  const palletIds = [
    ...new Set(
      (reservations ?? [])
        .map((r) => r.pallet_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  if (input.forecastShipQty && input.forecastShipQty > 0 && palletIds.length) {
    const { data: pallets } = await sb
      .from("pallets")
      .select(
        "id, cost_cents, freight_target_cents, selected_inbound_freight_quote_id, shipping_ordered_at, status",
      )
      .in("id", palletIds);

    let freightSum = 0;
    let freightN = 0;
    for (const p of pallets ?? []) {
      let selectedSek: number | null = null;
      if (p.selected_inbound_freight_quote_id) {
        const { data: q } = await sb
          .from("pallet_freight_quotes")
          .select("total_cost_sek_cents, economically_usable, selected")
          .eq("id", p.selected_inbound_freight_quote_id)
          .maybeSingle();
        if (
          q?.economically_usable &&
          q?.selected &&
          Number(q.total_cost_sek_cents) > 0
        ) {
          selectedSek = Math.round(Number(q.total_cost_sek_cents));
        }
      }
      const target = resolveFreightTargetCents({
        cost_cents: p.cost_cents,
        freight_target_cents: p.freight_target_cents,
        selected_inbound_freight_quote_total_sek_cents: selectedSek,
      });
      if (target > 0) {
        freightSum += target;
        freightN += 1;
      }
    }
    if (freightN > 0) {
      const avgFreight = Math.round(freightSum / freightN);
      const perBottle = inboundFreightCentsPerBottle(
        avgFreight,
        input.forecastShipQty,
      );
      const totalBottles = rows.reduce(
        (s, r) => s + Math.max(0, Math.floor(Number(r.quantity) || 0)),
        0,
      );
      inboundCents = perBottle * totalBottles;
      inboundKind = "forecast";
    }
  }

  const breakdown = aggregatePactActuals({
    rows,
    orderCount: reservationIds.length,
    inboundFreightCents: inboundCents,
    inboundAllocationKind: inboundKind,
    opexAllocatedCents: input.opexAllocatedCents,
  });

  // Wine rollup (known only)
  const byWine = new Map<
    string,
    { bottles: number; productNet: number; gm1: number; gm2: number; incomplete: boolean }
  >();
  for (const i of items ?? []) {
    const qty = Math.max(0, Math.floor(Number(i.quantity) || 0));
    const snap = i.economics_snapshot as Record<string, unknown> | null;
    if (!snap || snap.incomplete === true) continue;
    const wid = String(i.item_id);
    const cur = byWine.get(wid) ?? {
      bottles: 0,
      productNet: 0,
      gm1: 0,
      gm2: 0,
      incomplete: false,
    };
    const net = (Number(snap.unit_net_revenue_cents) || 0) * qty;
    const purchase = (Number(snap.unit_purchase_cost_cents) || 0) * qty;
    const excise = (Number(snap.unit_excise_cents) || 0) * qty;
    const ship = (Number(snap.unit_shipping_revenue_net_cents) || 0) * qty;
    const pay = (Number(snap.unit_payment_fee_cents) || 0) * qty;
    const out = (Number(snap.unit_last_mile_cost_cents) || 0) * qty;
    const epr = (Number(snap.unit_epr_cents) || 0) * qty;
    const refund = (Number(snap.unit_refund_reserve_cents) || 0) * qty;
    const gm1 = net - purchase - excise;
    const gm2 = gm1 + ship - pay - out - epr - refund;
    cur.bottles += qty;
    cur.productNet += net;
    cur.gm1 += gm1;
    cur.gm2 += gm2;
    byWine.set(wid, cur);
  }

  const wineRows = [...byWine.entries()].map(([wineId, v]) => ({
    wineId,
    bottles: v.bottles,
    productNetCents: v.productNet,
    gm1Cents: v.gm1,
    gm2Cents: v.gm2,
    completeness: "known",
  }));

  return {
    breakdown,
    wineRows,
    shippingAudit: summarizeShippingAudit(auditRows),
  };
}

export async function loadDirtywineFinanceOverview(input: {
  start: Date;
  end: Date;
  opexAllocatedCents: number;
}): Promise<FinanceBreakdown> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("dirty_wine_orders")
    .select("id, order_id, total_cents, invoice_data, order_date, created_at")
    .gte("created_at", input.start.toISOString())
    .lte("created_at", input.end.toISOString());

  if (error) {
    console.error("[finance] dirtywine:", error.message);
    return aggregateDirtywineActuals({
      orders: [],
      opexAllocatedCents: input.opexAllocatedCents,
    });
  }

  return aggregateDirtywineActuals({
    orders: (data ?? []).map((r) => ({
      orderId: String(r.order_id ?? r.id),
      invoice: (r.invoice_data as InvoiceData) ?? null,
      totalCents: Math.round(Number(r.total_cents) || 0),
    })),
    opexAllocatedCents: input.opexAllocatedCents,
  });
}

export function mergeChannelBreakdowns(
  channel: FinanceChannel,
  pact: FinanceBreakdown,
  dirty: FinanceBreakdown,
): FinanceBreakdown {
  if (channel === "pact") return pact;
  if (channel === "dirtywine") return dirty;

  return buildFinanceBreakdown({
    channel: "all",
    mode: "actuals",
    bottles: pact.bottles + dirty.bottles,
    orders: pact.orders + dirty.orders,
    bottlesKnown: pact.bottlesKnown + dirty.bottlesKnown,
    bottlesIncomplete: pact.bottlesIncomplete + dirty.bottlesIncomplete,
    productGrossRevenueCents:
      pact.productGrossRevenueCents + dirty.productGrossRevenueCents,
    productNetRevenueCents:
      pact.productNetRevenueCents + dirty.productNetRevenueCents,
    shippingGrossRevenueCents:
      pact.shippingGrossRevenueCents + dirty.shippingGrossRevenueCents,
    shippingNetRevenueCents:
      pact.shippingNetRevenueCents + dirty.shippingNetRevenueCents,
    discountCents: pact.discountCents + dirty.discountCents,
    producerPurchaseCostCents:
      pact.producerPurchaseCostCents + dirty.producerPurchaseCostCents,
    alcoholExciseCents: pact.alcoholExciseCents + dirty.alcoholExciseCents,
    paymentFeesCents: pact.paymentFeesCents + dirty.paymentFeesCents,
    outboundCarrierCostCents:
      pact.outboundCarrierCostCents + dirty.outboundCarrierCostCents,
    eprCents: pact.eprCents + dirty.eprCents,
    refundBreakageReserveCents:
      pact.refundBreakageReserveCents + dirty.refundBreakageReserveCents,
    inboundFreightCents: pact.inboundFreightCents + dirty.inboundFreightCents,
    inboundAllocationKind:
      pact.inboundAllocationKind === "none"
        ? dirty.inboundAllocationKind
        : pact.inboundAllocationKind,
    opexAllocatedCents: pact.opexAllocatedCents + dirty.opexAllocatedCents,
    completeness:
      pact.completeness === "complete" && dirty.completeness === "complete"
        ? "complete"
        : "partial",
    warnings: [...pact.warnings, ...dirty.warnings],
  });
}

export async function buildFinanceOverviewPayload(input: {
  channel: FinanceChannel;
  start: Date;
  end: Date;
  forecastShipQty?: number | null;
}) {
  const opexEntries = await loadFinanceOpexEntries();
  const period = { start: input.start, end: input.end };

  const pactOpex = allocateOpexByChannel(opexEntries, period, "pact");
  const dirtyOpex = allocateOpexByChannel(opexEntries, period, "dirtywine");
  const allOpex = allocateOpexByChannel(opexEntries, period, "all");

  const pact =
    input.channel === "dirtywine"
      ? null
      : await loadPactFinanceOverview({
          start: input.start,
          end: input.end,
          opexAllocatedCents:
            input.channel === "all"
              ? pactOpex.allocatedCents
              : pactOpex.allocatedCents,
          forecastShipQty: input.forecastShipQty ?? 240,
        });

  const dirty =
    input.channel === "pact"
      ? null
      : await loadDirtywineFinanceOverview({
          start: input.start,
          end: input.end,
          opexAllocatedCents: dirtyOpex.allocatedCents,
        });

  const emptyPact = aggregatePactActuals({
    rows: [],
    orderCount: 0,
    opexAllocatedCents: 0,
  });
  const emptyDirty = aggregateDirtywineActuals({
    orders: [],
    opexAllocatedCents: 0,
  });

  let breakdown = mergeChannelBreakdowns(
    input.channel,
    pact?.breakdown ?? emptyPact,
    dirty ?? emptyDirty,
  );

  if (input.channel === "all") {
    breakdown = {
      ...breakdown,
      opexAllocatedCents: allOpex.allocatedCents,
      operatingContributionCents:
        breakdown.gm3Cents - allOpex.allocatedCents,
    };
  }

  const gm3PerBottle =
    breakdown.bottlesKnown > 0
      ? Math.round(breakdown.gm3Cents / breakdown.bottlesKnown)
      : 0;

  const breakEven = calculateBreakEven({
    opexCents: breakdown.opexAllocatedCents,
    gm3CentsPerBottle: gm3PerBottle,
    gm3PercentOfProductNet: breakdown.gm3PercentOfProductNet,
  });

  return {
    breakdown,
    wineRows: pact?.wineRows ?? [],
    shippingAudit: pact?.shippingAudit ?? summarizeShippingAudit([]),
    opex: {
      entries: opexEntries,
      allocatedCents: breakdown.opexAllocatedCents,
      sharedUnallocatedCents:
        input.channel === "all"
          ? allOpex.sharedUnallocatedCents
          : input.channel === "pact"
            ? pactOpex.sharedUnallocatedCents
            : dirtyOpex.sharedUnallocatedCents,
      byCategory:
        input.channel === "dirtywine"
          ? dirtyOpex.byCategory
          : input.channel === "pact"
            ? pactOpex.byCategory
            : allOpex.byCategory,
    },
    breakEven,
    disclaimer:
      "Management economics — not statutory accounting, tax return, or audited P&L.",
  };
}
