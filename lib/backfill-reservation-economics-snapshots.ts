/**
 * Backfill frozen economics snapshots for order_reservation_items that predate
 * Phase 2 checkout snapshot writes.
 *
 * Reconstruction is best-effort from current wine list prices + pallet last-mile:
 * - Gross revenue: wines.base_price_cents (not the historical paid amount if promo/member)
 * - Customer shipping revenue: 0 (not stored on legacy rows)
 * - Outbound: legacy last-mile from pallet / env
 * - FX: strict EUR→SEK (or wine.exchange_rate / rateMap)
 *
 * Only fills rows where economics_snapshot IS NULL. Never overwrites existing.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";
import {
  buildReservationItemEconomicsRows,
  type WineEconomicsFields,
} from "@/lib/reservation-economics-snapshot";
import { getContributionAssumptions } from "@/lib/contribution-assumptions";
import { resolveLastMileCostCentsPerBottle } from "@/lib/shipping-calculations";
import { fetchExchangeRateToSekStrict } from "@/lib/exchange-rate-strict";
import { collectCurrenciesNeedingRates } from "@/lib/b2b-wine-cost";

export type BackfillEconomicsResult = {
  palletId: string | null;
  scannedItems: number;
  updatedItems: number;
  skippedExisting: number;
  skippedCancelled: number;
  failedItems: number;
  errors: string[];
  accumulatedContributionCents: number;
};

async function loadRateMap(
  wines: WineEconomicsFields[],
): Promise<Record<string, number>> {
  const currencies = collectCurrenciesNeedingRates(wines);
  const rateMap: Record<string, number> = {};
  for (const currency of currencies) {
    const live = await fetchExchangeRateToSekStrict(currency);
    if (live && !live.fallback) {
      rateMap[currency] = live.rate;
      continue;
    }
    // Direct public rate as last resort for backfill (not accepted for new checkouts
    // when marked fallback; here we need *some* FX to reconstruct shadow meters).
    try {
      const res = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${currency}`,
        { cache: "no-store" },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as { rates?: { SEK?: number } };
      const rate = Number(data.rates?.SEK);
      if (Number.isFinite(rate) && rate > 0) rateMap[currency] = rate;
    } catch {
      /* leave missing — row will be incomplete */
    }
  }
  return rateMap;
}

/**
 * Backfill missing snapshots for fill-eligible reservations on one pallet,
 * or all pallets when palletId is null.
 */
export async function backfillMissingReservationEconomicsSnapshots(options?: {
  palletId?: string | null;
  dryRun?: boolean;
}): Promise<BackfillEconomicsResult> {
  const sb = getSupabaseAdmin();
  const palletId = options?.palletId ?? null;
  const dryRun = options?.dryRun === true;
  const assumptions = getContributionAssumptions();

  const result: BackfillEconomicsResult = {
    palletId,
    scannedItems: 0,
    updatedItems: 0,
    skippedExisting: 0,
    skippedCancelled: 0,
    failedItems: 0,
    errors: [],
    accumulatedContributionCents: 0,
  };

  let resQuery = sb
    .from("order_reservations")
    .select("id, status, pallet_id, discount_amount_sek")
    .in("status", [...PALLET_FILL_STATUSES]);
  if (palletId) {
    resQuery = resQuery.eq("pallet_id", palletId);
  }

  const { data: reservations, error: resErr } = await resQuery;
  if (resErr) {
    result.errors.push(resErr.message);
    return result;
  }
  if (!reservations?.length) return result;

  const reservationIds = reservations.map((r) => r.id as string);
  const reservationById = new Map(
    reservations.map((r) => [r.id as string, r] as const),
  );

  const palletIds = [
    ...new Set(
      reservations
        .map((r) => r.pallet_id as string | null)
        .filter((id): id is string => !!id),
    ),
  ];
  const lastMileByPallet = new Map<string, number>();
  if (palletIds.length > 0) {
    const { data: pallets } = await sb
      .from("pallets")
      .select("id, last_mile_cost_cents_per_bottle")
      .in("id", palletIds);
    for (const p of pallets ?? []) {
      lastMileByPallet.set(
        p.id as string,
        resolveLastMileCostCentsPerBottle(
          (p as { last_mile_cost_cents_per_bottle?: number | null })
            .last_mile_cost_cents_per_bottle,
        ),
      );
    }
  }

  const { data: items, error: itemsErr } = await sb
    .from("order_reservation_items")
    .select(
      "id, reservation_id, item_id, quantity, economics_snapshot, pre_pallet_contribution_cents",
    )
    .in("reservation_id", reservationIds);
  if (itemsErr) {
    result.errors.push(itemsErr.message);
    return result;
  }

  const missing = (items ?? []).filter((it) => it.economics_snapshot == null);
  result.scannedItems = (items ?? []).length;
  result.skippedExisting = (items ?? []).length - missing.length;
  if (missing.length === 0) return result;

  const wineIds = [
    ...new Set(missing.map((it) => String(it.item_id)).filter(Boolean)),
  ];
  const { data: wines, error: wineErr } = await sb
    .from("wines")
    .select(
      "id, base_price_cents, cost_amount, cost_currency, exchange_rate, alcohol_tax_cents, price_includes_vat",
    )
    .in("id", wineIds);
  if (wineErr) {
    result.errors.push(wineErr.message);
    return result;
  }

  const wineById = new Map<string, WineEconomicsFields & { base_price_cents?: number | null }>();
  for (const row of wines ?? []) {
    wineById.set(String((row as { id: string }).id), row as WineEconomicsFields & {
      base_price_cents?: number | null;
    });
  }

  const rateMap = await loadRateMap([...wineById.values()]);

  // Group missing items by reservation so discount/fixed fee allocate correctly
  const byReservation = new Map<string, typeof missing>();
  for (const it of missing) {
    const rid = String(it.reservation_id);
    const list = byReservation.get(rid) ?? [];
    list.push(it);
    byReservation.set(rid, list);
  }

  for (const [rid, rows] of byReservation) {
    const reservation = reservationById.get(rid);
    if (!reservation) continue;

    const palletLastMile = reservation.pallet_id
      ? lastMileByPallet.get(String(reservation.pallet_id)) ?? 0
      : 0;

    const lines = rows.map((it) => {
      const wine = wineById.get(String(it.item_id));
      const qty = Math.max(0, Math.floor(Number(it.quantity) || 0));
      const unitCents = Math.max(0, Math.round(Number(wine?.base_price_cents) || 0));
      return {
        merchandiseId: String(it.item_id),
        quantity: qty,
        lineTotalSek: (unitCents * qty) / 100,
        rowId: String(it.id),
      };
    });

    const built = buildReservationItemEconomicsRows({
      reservationId: rid,
      lines: lines.map(({ merchandiseId, quantity, lineTotalSek }) => ({
        merchandiseId,
        quantity,
        lineTotalSek,
      })),
      wineById,
      orderLevelDiscountCents: Math.round(
        (Number(reservation.discount_amount_sek) || 0) * 100,
      ),
      shippingRevenueGrossCents: 0,
      outbound: {
        mode: "legacy_last_mile",
        lastMileCostCentsPerBottle: palletLastMile,
      },
      paymentFeeFixedCents: assumptions.stripeFeeFixedCents,
      rateMap,
      assumptions,
    });

    // Match built rows back to DB item ids (same order as lines filter >0)
    const lineIds = lines.filter((l) => l.quantity > 0).map((l) => l.rowId);
    for (let i = 0; i < built.length; i++) {
      const row = built[i]!;
      const itemId = lineIds[i];
      if (!itemId) {
        result.failedItems += 1;
        result.errors.push(`No item id for built row on reservation ${rid}`);
        continue;
      }

      // Provenance on frozen JSON
      const snapshot = {
        ...row.economics_snapshot,
        backfill: true,
        backfill_at: new Date().toISOString(),
        backfill_notes:
          "Reconstructed from wines.base_price_cents + pallet last-mile; customer shipping revenue unknown (0); does not overwrite historical paid amounts.",
      };

      if (dryRun) {
        result.updatedItems += 1;
        if (row.pre_pallet_contribution_cents != null) {
          result.accumulatedContributionCents +=
            row.pre_pallet_contribution_cents;
        }
        continue;
      }

      const { error: updErr } = await sb
        .from("order_reservation_items")
        .update({
          economics_snapshot: snapshot,
          pre_pallet_contribution_cents: row.pre_pallet_contribution_cents,
          outbound_freight_quote_id: row.outbound_freight_quote_id ?? null,
        })
        .eq("id", itemId)
        .is("economics_snapshot", null);

      if (updErr) {
        result.failedItems += 1;
        result.errors.push(`${itemId}: ${updErr.message}`);
        continue;
      }
      result.updatedItems += 1;
      if (row.pre_pallet_contribution_cents != null) {
        result.accumulatedContributionCents += row.pre_pallet_contribution_cents;
      }
    }
  }

  return result;
}
