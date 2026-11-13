/**
 * Server helper: resolve "X av Y flaskor" for a shared pallet under coverage-close.
 * Y = bottles needed for the CURRENT threshold (recomputed when threshold drops).
 * No countdown / deadline.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";
import { getPalletCoverageCloseConfig } from "@/lib/pallet-coverage-close/config";
import type { CoverageOrderInput } from "@/lib/pallet-coverage-close/coverage";
import {
  bottlesNeededForCurrentThreshold,
  type ProgressDisplay,
} from "@/lib/pallet-coverage-close/progress-display";
import { coverageProgressLabel } from "@/lib/pallet-coverage-close/customer-copy";

export type ResolvedCoverageProgress = ProgressDisplay & {
  palletId: string;
  /** TODO(Juliette/Margaux) placeholder label for customer UI. */
  label: string;
  /** Pass as checkout fill `capacity` (Y). */
  capacityForDisplay: number;
};

async function loadCoverageOrders(
  palletId: string,
): Promise<{ orders: CoverageOrderInput[]; firstOrderAt: string | null }> {
  const sb = getSupabaseAdmin();
  const { data: reservations } = await sb
    .from("order_reservations")
    .select("id, created_at")
    .eq("pallet_id", palletId)
    .in("status", [...PALLET_FILL_STATUSES])
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (!reservations?.length) {
    return { orders: [], firstOrderAt: null };
  }

  const firstOrderAt = String(reservations[0]!.created_at);
  const orders: CoverageOrderInput[] = [];

  for (const res of reservations) {
    const { data: items } = await sb
      .from("order_reservation_items")
      .select("quantity, sold_out_choice_state")
      .eq("reservation_id", res.id);

    let bottles = 0;
    for (const item of items ?? []) {
      if (item.sold_out_choice_state === "removed") continue;
      bottles += Math.max(0, Math.floor(Number(item.quantity) || 0));
    }
    if (bottles > 0) {
      orders.push({ bottleCount: bottles });
    }
  }

  return { orders, firstOrderAt };
}

/**
 * Returns null when coverage-close is not enabled for this pallet / env,
 * or when there is no first-order clock yet (empty pallet — use bottle cap).
 */
export async function resolveCoverageProgressForPallet(opts: {
  palletId: string;
  locale?: "sv" | "en";
  now?: Date;
  /** Include cart bottles that will join (checkout). */
  cartBottles?: number;
}): Promise<ResolvedCoverageProgress | null> {
  const cfg = getPalletCoverageCloseConfig();
  if (!cfg.enabled) return null;

  const sb = getSupabaseAdmin();
  const { data: pallet } = await sb
    .from("pallets")
    .select("id, first_order_at, coverage_close_enabled, coverage_locked_at")
    .eq("id", opts.palletId)
    .maybeSingle();

  if (!pallet) return null;
  if (pallet.coverage_close_enabled === false) return null;

  const { orders, firstOrderAt: derived } = await loadCoverageOrders(
    opts.palletId,
  );
  const firstOrderAt = pallet.first_order_at ?? derived ?? opts.now ?? new Date();

  const progress = bottlesNeededForCurrentThreshold({
    orders,
    firstOrderAt,
    now: opts.now,
    cfg,
  });

  const cart = Math.max(0, Math.floor(Number(opts.cartBottles) || 0));
  const filledBottles = progress.filledBottles + cart;
  const locale = opts.locale === "en" ? "en" : "sv";

  return {
    ...progress,
    filledBottles,
    palletId: opts.palletId,
    capacityForDisplay: progress.targetBottles,
    label: coverageProgressLabel({
      locale,
      filled: filledBottles,
      target: progress.targetBottles,
    }),
  };
}
