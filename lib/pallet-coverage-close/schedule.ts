/**
 * Lock decisioning: immediate at bottle cap; otherwise schedule next
 * configurable weekday (default Monday) when coverage threshold is met.
 * Re-check at lock time — if below threshold, clear schedule (do not lock).
 */

import {
  getPalletCoverageCloseConfig,
  type PalletCoverageCloseConfig,
} from "@/lib/pallet-coverage-close/config";
import {
  computePalletCoverage,
  exceedsMaxLossGuard,
  type CoverageOrderInput,
  type PalletCoverageResult,
} from "@/lib/pallet-coverage-close/coverage";
import {
  resolveCoverageThreshold,
  type CoverageThreshold,
} from "@/lib/pallet-coverage-close/threshold";

export type LockDecision =
  | {
      action: "lock_immediately";
      reason: "bottle_cap" | "threshold_recheck";
      coverage: PalletCoverageResult;
      threshold: CoverageThreshold;
    }
  | {
      action: "schedule_lock";
      reason: "threshold_met";
      scheduledLockAt: Date;
      coverage: PalletCoverageResult;
      threshold: CoverageThreshold;
    }
  | {
      action: "clear_schedule";
      reason: "below_threshold_at_recheck" | "below_threshold";
      coverage: PalletCoverageResult;
      threshold: CoverageThreshold;
    }
  | {
      action: "noop";
      reason: "waiting" | "already_scheduled" | "disabled_guard";
      coverage: PalletCoverageResult;
      threshold: CoverageThreshold;
    };

/** Next occurrence of cfg.lockWeekday at 00:00 UTC on/after `from` (exclusive of today if already that weekday and past midnight — use next week). */
export function nextLockWeekdayUtc(
  from: Date,
  weekday: number = 1,
): Date {
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  const current = d.getUTCDay();
  let add = (weekday - current + 7) % 7;
  if (add === 0) {
    // If we're already on the lock weekday at/after local decision, schedule next week.
    add = 7;
  }
  d.setUTCDate(d.getUTCDate() + add);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function evaluateLockDecision(input: {
  orders: CoverageOrderInput[];
  firstOrderAt: Date | string;
  now?: Date;
  /** Existing scheduled lock (ISO/Date), if any. */
  scheduledLockAt?: Date | string | null;
  /** When true, we are at the scheduled lock instant — re-check only. */
  atScheduledLockTime?: boolean;
  cfg?: PalletCoverageCloseConfig;
}): LockDecision {
  const cfg = input.cfg ?? getPalletCoverageCloseConfig({});
  const now = input.now ?? new Date();
  const coverage = computePalletCoverage(input.orders, cfg);
  const threshold = resolveCoverageThreshold(input.firstOrderAt, now, cfg);

  if (coverage.bottleCount >= cfg.bottleCap) {
    return {
      action: "lock_immediately",
      reason: "bottle_cap",
      coverage,
      threshold,
    };
  }

  const required = threshold.requiredCoverage;
  const meets =
    required != null && coverage.coverageRatio + 1e-12 >= required;

  // Optional max-loss guard: never lock/schedule if loss would exceed cap
  // while still below floor coverage. (Does not override bottle cap.)
  if (
    meets &&
    exceedsMaxLossGuard(coverage, cfg) &&
    (required == null || required > cfg.coverageFloor + 1e-12)
  ) {
    return {
      action: "noop",
      reason: "disabled_guard",
      coverage,
      threshold,
    };
  }

  if (input.atScheduledLockTime) {
    if (meets) {
      return {
        action: "lock_immediately",
        reason: "threshold_recheck",
        coverage,
        threshold,
      };
    }
    return {
      action: "clear_schedule",
      reason: "below_threshold_at_recheck",
      coverage,
      threshold,
    };
  }

  if (!meets) {
    if (input.scheduledLockAt) {
      return {
        action: "clear_schedule",
        reason: "below_threshold",
        coverage,
        threshold,
      };
    }
    return {
      action: "noop",
      reason: "waiting",
      coverage,
      threshold,
    };
  }

  if (input.scheduledLockAt) {
    return {
      action: "noop",
      reason: "already_scheduled",
      coverage,
      threshold,
    };
  }

  return {
    action: "schedule_lock",
    reason: "threshold_met",
    scheduledLockAt: nextLockWeekdayUtc(now, cfg.lockWeekday),
    coverage,
    threshold,
  };
}

/**
 * At scheduled lock time: lock only if still at/above threshold; else clear.
 */
export function recheckAtLockTime(input: {
  orders: CoverageOrderInput[];
  firstOrderAt: Date | string;
  now?: Date;
  cfg?: PalletCoverageCloseConfig;
}): Extract<LockDecision, { action: "lock_immediately" | "clear_schedule" }> {
  const decision = evaluateLockDecision({
    ...input,
    atScheduledLockTime: true,
  });
  if (decision.action === "lock_immediately") {
    return decision;
  }
  return {
    action: "clear_schedule",
    reason: "below_threshold_at_recheck",
    coverage: decision.coverage,
    threshold: decision.threshold,
  };
}
