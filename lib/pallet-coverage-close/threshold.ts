/**
 * Time-based coverage thresholds from the pallet's first active order.
 *
 * days 0–6: cap only (no coverage threshold)
 * from day 7: 125%
 * from day 14: 100%
 * from day 21: floor 70%
 * Never below the floor once day ≥ floor day.
 */

import {
  getPalletCoverageCloseConfig,
  type PalletCoverageCloseConfig,
} from "@/lib/pallet-coverage-close/config";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CoverageThresholdPhase =
  | "cap_only"
  | "coverage_day7"
  | "coverage_100"
  | "coverage_floor";

export type CoverageThreshold = {
  phase: CoverageThresholdPhase;
  /** Required coverage ratio, or null when only the bottle cap applies. */
  requiredCoverage: number | null;
  /** Whole days since first order (floor). */
  dayIndex: number;
};

export function daysSinceFirstOrder(
  firstOrderAt: Date | string,
  now: Date = new Date(),
): number {
  const start = new Date(firstOrderAt).getTime();
  const end = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / DAY_MS));
}

export function resolveCoverageThreshold(
  firstOrderAt: Date | string,
  now: Date = new Date(),
  cfg: PalletCoverageCloseConfig = getPalletCoverageCloseConfig({}),
): CoverageThreshold {
  const dayIndex = daysSinceFirstOrder(firstOrderAt, now);

  if (dayIndex >= cfg.coverageFloorFromDay) {
    return {
      phase: "coverage_floor",
      requiredCoverage: cfg.coverageFloor,
      dayIndex,
    };
  }
  if (dayIndex >= cfg.coverage100FromDay) {
    return {
      phase: "coverage_100",
      requiredCoverage: cfg.coverage100,
      dayIndex,
    };
  }
  if (dayIndex >= cfg.coverageDay7FromDay) {
    return {
      phase: "coverage_day7",
      requiredCoverage: cfg.coverageDay7,
      dayIndex,
    };
  }
  return { phase: "cap_only", requiredCoverage: null, dayIndex };
}

/**
 * Floor invariant: once past the floor day, requiredCoverage is never below floor.
 */
export function assertNeverBelowFloor(
  threshold: CoverageThreshold,
  cfg: PalletCoverageCloseConfig = getPalletCoverageCloseConfig({}),
): boolean {
  if (threshold.dayIndex < cfg.coverageFloorFromDay) return true;
  if (threshold.requiredCoverage == null) return false;
  return threshold.requiredCoverage >= cfg.coverageFloor - 1e-12;
}
