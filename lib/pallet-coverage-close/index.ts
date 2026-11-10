export {
  PALLET_COVERAGE_CLOSE_DEFAULTS,
  defaultSixPackContributionBeforePalletOre,
  getPalletCoverageCloseConfig,
  type PalletCoverageCloseConfig,
} from "@/lib/pallet-coverage-close/config";

export {
  computePalletCoverage,
  contributionBeforePalletForOrder,
  exceedsMaxLossGuard,
  stripeFeeOreForBase,
  type CoverageOrderInput,
  type OrderContributionBreakdown,
  type PalletCoverageResult,
} from "@/lib/pallet-coverage-close/coverage";

export {
  assertNeverBelowFloor,
  daysSinceFirstOrder,
  resolveCoverageThreshold,
  type CoverageThreshold,
  type CoverageThresholdPhase,
} from "@/lib/pallet-coverage-close/threshold";

export {
  evaluateLockDecision,
  nextLockWeekdayUtc,
  recheckAtLockTime,
  type LockDecision,
} from "@/lib/pallet-coverage-close/schedule";

export {
  bottlesNeededForCurrentThreshold,
  ordersNeededForCoverageRatio,
  type ProgressDisplay,
} from "@/lib/pallet-coverage-close/progress-display";

export {
  coverageCheckoutHint,
  coverageProgressLabel,
  coverageTermsPlaceholder,
} from "@/lib/pallet-coverage-close/customer-copy";

export {
  resolveCoverageProgressForPallet,
  type ResolvedCoverageProgress,
} from "@/lib/pallet-coverage-close/resolve-progress";

export {
  applySoldOutChoice,
  applySoldOutChoiceTimeout,
  computeChargeAfterSoldOutChoices,
  isSoldOutChoicePastDeadline,
  markWineUnavailableOnLines,
  soldOutChoiceDeadlineAt,
  SOLD_OUT_LINE_STATES,
  type ChargeAdjustmentResult,
  type SoldOutChoice,
  type SoldOutLineSnapshot,
  type SoldOutLineState,
} from "@/lib/pallet-coverage-close/sold-out-choice";

export {
  isAcceptingSharedPalletStatus,
  resolveOrderPalletAssignment,
  selectSingleOpenSharedPallet,
  type OpenPalletCandidate,
} from "@/lib/pallet-coverage-close/one-open-pallet";

export {
  buildPalletLockHeadsUpEmail,
  buildSoldOutChoiceEmail,
} from "@/lib/pallet-coverage-close/emails";
