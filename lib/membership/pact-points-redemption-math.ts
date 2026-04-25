/**
 * Pure PACT Points redemption math (safe for client and server).
 * Keep PACT_POINTS_MAX_ORDER_CAP_PERCENT in sync with
 * PACT_POINTS_MAX_REDEMPTION_PERCENT in pact-points-engine.ts.
 */

export const PACT_POINTS_BOOST_MULTIPLIER = 2;

const PACT_POINTS_MAX_ORDER_CAP_PERCENT = 50;

export function allocatePactRedemptionPoints(
  points: number,
  boostedLineTotal: number,
  nonBoostedLineTotal: number,
): {
  pointsBoosted: number;
  pointsNonBoosted: number;
  sekDiscount: number;
} {
  const M = PACT_POINTS_BOOST_MULTIPLIER;
  const b = Math.max(0, Number(boostedLineTotal) || 0);
  const n = Math.max(0, Number(nonBoostedLineTotal) || 0);
  const p = Math.max(0, Math.floor(Number(points) || 0));
  const maxBoostPoints = Math.floor(b / M);
  const pointsBoosted = Math.min(p, maxBoostPoints);
  const sekFromBoosted = pointsBoosted * M;
  const remaining = p - pointsBoosted;
  const maxNonPoints = Math.floor(n);
  const pointsNonBoosted = Math.min(remaining, maxNonPoints);
  const sekFromNonBoosted = pointsNonBoosted;
  return {
    pointsBoosted,
    pointsNonBoosted,
    sekDiscount: sekFromBoosted + sekFromNonBoosted,
  };
}

function greedySekFromPoints(
  points: number,
  boostedLineTotal: number,
  nonBoostedLineTotal: number,
): number {
  return allocatePactRedemptionPoints(
    points,
    boostedLineTotal,
    nonBoostedLineTotal,
  ).sekDiscount;
}

/**
 * Max points redeemable and resulting SEK discount, respecting:
 * - 50% of (boostedLineTotal + nonBoostedLineTotal) SEK cap
 * - Boost lines: each point yields up to PACT_POINTS_BOOST_MULTIPLIER SEK off boosted subtotal
 * - Non-boost: 1 point = 1 SEK off non-boosted subtotal
 * - availablePoints upper bound
 */
export function calculateBoostAwareMaxRedemption(
  boostedLineTotal: number,
  nonBoostedLineTotal: number,
  availablePoints: number,
): { maxPoints: number; maxSekDiscount: number } {
  const boosted = Math.max(0, Number(boostedLineTotal) || 0);
  const nonBoosted = Math.max(0, Number(nonBoostedLineTotal) || 0);
  const orderTotal = boosted + nonBoosted;
  const maxSekCap = Math.floor(
    (orderTotal * PACT_POINTS_MAX_ORDER_CAP_PERCENT) / 100,
  );
  const avail = Math.max(0, Math.floor(Number(availablePoints) || 0));
  if (maxSekCap <= 0 || avail <= 0) {
    return { maxPoints: 0, maxSekDiscount: 0 };
  }
  const M = PACT_POINTS_BOOST_MULTIPLIER;
  const lineCapPoints = Math.floor(boosted / M) + Math.floor(nonBoosted);
  const hi = Math.min(avail, lineCapPoints);
  let lo = 0;
  let high = hi;
  while (lo < high) {
    const mid = lo + Math.floor((high - lo + 1) / 2);
    const sek = greedySekFromPoints(mid, boosted, nonBoosted);
    if (sek <= maxSekCap) lo = mid;
    else high = mid - 1;
  }
  return {
    maxPoints: lo,
    maxSekDiscount: greedySekFromPoints(lo, boosted, nonBoosted),
  };
}
