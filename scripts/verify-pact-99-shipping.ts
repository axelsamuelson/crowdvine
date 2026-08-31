import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import {
  allocateCustomerShippingByBottles,
  resolveCustomerShippingQuote,
} from "../lib/customer-shipping-pricing";
import {
  classifyHistoricalShippingRow,
  summarizeHistoricalShippingAudit,
} from "../lib/finance/historical-shipping-audit";
import { PALLET_FILL_STATUSES } from "../lib/pallet-fill-count";
import { computePalletShipProgress } from "../lib/pallet-ship-progress";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2]!.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  process.env[m[1]!] = v;
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  const { data: rateRows } = await sb
    .from("customer_shipping_rates")
    .select("*")
    .eq("active", true);

  const rates = (rateRows || []).map((r) => ({
    id: String(r.id),
    channel: r.channel as "pact",
    countryCode: r.country_code as string | null,
    flatFeeCents: Number(r.flat_fee_cents),
    freeShipping: r.free_shipping === true,
    freeShippingThresholdCents:
      r.free_shipping_threshold_cents == null
        ? null
        : Number(r.free_shipping_threshold_cents),
    minBottles: r.min_bottles as number | null,
    maxBottles: r.max_bottles as number | null,
    active: r.active !== false,
    validFrom: r.valid_from as string | null,
    validTo: r.valid_to as string | null,
  }));

  const legacy = {
    costCents: 0,
    bottleCapacity: 720,
    lastMileCostCentsPerBottle: 0,
    bottles: 6,
  };
  const results: Record<string, unknown> = {};
  for (const bottles of [1, 6, 12]) {
    const q = resolveCustomerShippingQuote({
      bottleCount: bottles,
      countryCode: "SE",
      rates,
      allowLegacyFallback: true,
      legacy: { ...legacy, bottles },
    });
    results[`${bottles}btl`] = {
      grossCents: q.grossCents,
      source: q.source,
      complete: q.complete,
      freeShipping: q.freeShipping,
    };
  }

  const split = allocateCustomerShippingByBottles(9900, [2, 4, 6]);

  const palletId = "3985cbfe-178f-4fa1-a897-17183a1f18db";
  const { data: pallet } = await sb
    .from("pallets")
    .select(
      "id, name, status, bottle_capacity, min_bottles_to_complete, is_complete",
    )
    .eq("id", palletId)
    .maybeSingle();
  const { data: res } = await sb
    .from("order_reservations")
    .select("id")
    .eq("pallet_id", palletId)
    .in("status", [...PALLET_FILL_STATUSES]);
  const ids = (res || []).map((r) => r.id);
  const { data: items } = await sb
    .from("order_reservation_items")
    .select("quantity")
    .in("reservation_id", ids);
  let bottlesFilled = 0;
  for (const i of items || []) {
    bottlesFilled += Math.max(0, Math.floor(Number(i.quantity) || 0));
  }
  const min = Number(pallet?.min_bottles_to_complete) || 120;
  const cap = Number(pallet?.bottle_capacity) || 720;
  const progress = computePalletShipProgress(bottlesFilled, min, cap);

  const { data: reservations } = await sb
    .from("order_reservations")
    .select("id, shipping_revenue_gross_cents, status")
    .in("status", [...PALLET_FILL_STATUSES])
    .limit(5000);
  const rids = (reservations || []).map((r) => r.id as string);
  const { data: allItems } = await sb
    .from("order_reservation_items")
    .select("reservation_id, quantity, economics_snapshot")
    .in("reservation_id", rids);
  const byRes = new Map<
    string,
    { bottles: number; ship: number; outbound: number }
  >();
  for (const i of allItems || []) {
    const rid = String(i.reservation_id);
    const qty = Math.max(0, Math.floor(Number(i.quantity) || 0));
    const snap = i.economics_snapshot as Record<string, unknown> | null;
    const cur = byRes.get(rid) || { bottles: 0, ship: 0, outbound: 0 };
    cur.bottles += qty;
    if (snap && typeof snap === "object") {
      cur.ship += (Number(snap.unit_shipping_revenue_gross_cents) || 0) * qty;
      cur.outbound += (Number(snap.unit_last_mile_cost_cents) || 0) * qty;
    }
    byRes.set(rid, cur);
  }
  const auditRows = (reservations || []).map((r) => {
    const agg = byRes.get(r.id as string) || {
      bottles: 0,
      ship: 0,
      outbound: 0,
    };
    return classifyHistoricalShippingRow({
      reservationId: r.id as string,
      bottles: agg.bottles,
      snapshotShippingGrossCents: agg.ship,
      reservationShippingGrossCents:
        r.shipping_revenue_gross_cents == null
          ? null
          : Number(r.shipping_revenue_gross_cents),
      outboundCostCents: agg.outbound,
    });
  });

  const { count: opexCount } = await sb
    .from("finance_opex_entries")
    .select("*", { count: "exact", head: true });

  console.log(
    JSON.stringify(
      {
        resolution: results,
        ratesLoaded: rates,
        multiReservationSplit: {
          weights: [2, 4, 6],
          parts: split,
          sum: split.reduce((a, b) => a + b, 0),
        },
        pallet: {
          id: palletId,
          name: pallet?.name,
          status: pallet?.status,
          bottles: bottlesFilled,
          min,
          pct: progress.shipProgressPercent,
          capacity: cap,
          is_complete: pallet?.is_complete,
          isReadyToShip: progress.isReadyToShip,
        },
        shippingAudit: summarizeHistoricalShippingAudit(auditRows),
        opexCount,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
