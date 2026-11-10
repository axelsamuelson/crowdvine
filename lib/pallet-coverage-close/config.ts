/**
 * Shared-pallet coverage close CONFIG (Axel 2026-11-11 / Ingrid CFO).
 * Defaults live here — override via env; do not hardcode at call sites.
 *
 * Coverage =
 *   (sum contribution-before-pallet-cost over active orders)
 *   / (fixed pallet cost + sum Instabee per order)
 *
 * Instabee is in the denominator only (not subtracted in the numerator).
 */

type EnvLike = NodeJS.ProcessEnv | Record<string, string | undefined>;

function envNumber(env: EnvLike, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function envInt(env: EnvLike, name: string, fallback: number): number {
  return Math.round(envNumber(env, name, fallback));
}

function envBool(env: EnvLike, name: string, fallback: boolean): boolean {
  const raw = env[name]?.trim().toLowerCase();
  if (raw == null || raw === "") return fallback;
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return fallback;
}

/** Ingrid defaults (SEK). Stored as öre in runtime helpers. */
export const PALLET_COVERAGE_CLOSE_DEFAULTS = {
  /** Wine margin kr/bottle when live wine margin is unavailable. */
  wineMarginSekPerBottle: 30.05,
  /** EPR / tax representative kr per order. */
  eprSekPerOrder: 29.7,
  /** Shipping income ex. VAT kr per order. */
  shippingIncomeExVatSekPerOrder: 79.2,
  /** Stripe percent of charged gross. */
  stripeFeePercent: 0.015,
  /** Stripe fixed fee kr per payment. */
  stripeFeeFixedSek: 1.8,
  /**
   * Assumed gross charged amount (kr) for default Stripe fee when building
   * the reference 6-pack contribution (~209.61). Live orders use real totals.
   * 1226 → 1.5%*1226 + 1.80 = 20.19; 180.30 − 29.70 + 79.20 − 20.19 = 209.61.
   */
  stripeFeeBaseSekForDefaultSixPack: 1226,
  /** Instabee last-mile kr per order (denominator only). */
  instabeeSekPerOrder: 84,
  /** Fixed inbound pallet cost kr. */
  fixedPalletCostSek: 5362.63,
  /** Hard bottle cap — lock immediately when reached. */
  bottleCap: 600,
  /** Day thresholds counted from the pallet's first active order. */
  thresholdDayStarts: {
    /** days 0–6: cap only (threshold null). */
    coverage150FromDay: 7,
    coverage100FromDay: 14,
    coverageFloorFromDay: 21,
  },
  coverage150: 1.5,
  coverage100: 1.0,
  coverageFloor: 0.7,
  /** Optional extra guard (kr). Null disables. */
  maxLossPerPalletSek: 2300,
  /** Weekday for scheduled lock (0=Sun … 1=Mon … 6=Sat). */
  lockWeekday: 1,
  /**
   * Sold-out customer choice reply window (days).
   * TODO(Axel): confirm default no-answer = remove & don't charge.
   */
  soldOutChoiceReplyDays: 7,
} as const;

export type PalletCoverageCloseConfig = {
  wineMarginOrePerBottle: number;
  eprOrePerOrder: number;
  shippingIncomeExVatOrePerOrder: number;
  stripeFeePercent: number;
  stripeFeeFixedOre: number;
  /** Used only for default/reference 6-pack contribution. */
  stripeFeeBaseOreForDefaultSixPack: number;
  instabeeOrePerOrder: number;
  fixedPalletCostOre: number;
  bottleCap: number;
  coverage150FromDay: number;
  coverage100FromDay: number;
  coverageFloorFromDay: number;
  coverage150: number;
  coverage100: number;
  coverageFloor: number;
  maxLossPerPalletOre: number | null;
  lockWeekday: number;
  soldOutChoiceReplyDays: number;
  /**
   * Master switch for coverage-close automation. Default OFF.
   * Set PALLET_COVERAGE_CLOSE_ENABLED=true after dry-run review.
   */
  enabled: boolean;
  /**
   * Heads-up + sold-out choice emails. Default OFF (like RESERVATION_EXPIRY_SEND_EMAIL).
   */
  sendEmail: boolean;
};

function sekToOre(sek: number): number {
  return Math.round(sek * 100);
}

export function getPalletCoverageCloseConfig(
  env: NodeJS.ProcessEnv = process.env,
): PalletCoverageCloseConfig {
  const d = PALLET_COVERAGE_CLOSE_DEFAULTS;
  const maxLossRaw = env.PALLET_COVERAGE_MAX_LOSS_SEK?.trim();
  let maxLossPerPalletOre: number | null = sekToOre(d.maxLossPerPalletSek);
  if (maxLossRaw === "" || maxLossRaw === "null" || maxLossRaw === "off") {
    maxLossPerPalletOre = null;
  } else if (maxLossRaw != null) {
    const n = Number(maxLossRaw);
    maxLossPerPalletOre =
      Number.isFinite(n) && n >= 0 ? sekToOre(n) : maxLossPerPalletOre;
  }

  return {
    wineMarginOrePerBottle: sekToOre(
      envNumber(
        env,
        "PALLET_COVERAGE_WINE_MARGIN_SEK_PER_BOTTLE",
        d.wineMarginSekPerBottle,
      ),
    ),
    eprOrePerOrder: sekToOre(
      envNumber(env, "PALLET_COVERAGE_EPR_SEK_PER_ORDER", d.eprSekPerOrder),
    ),
    shippingIncomeExVatOrePerOrder: sekToOre(
      envNumber(
        env,
        "PALLET_COVERAGE_SHIPPING_INCOME_EX_VAT_SEK",
        d.shippingIncomeExVatSekPerOrder,
      ),
    ),
    stripeFeePercent: envNumber(
      env,
      "PALLET_COVERAGE_STRIPE_FEE_PERCENT",
      d.stripeFeePercent,
    ),
    stripeFeeFixedOre: sekToOre(
      envNumber(env, "PALLET_COVERAGE_STRIPE_FEE_FIXED_SEK", d.stripeFeeFixedSek),
    ),
    stripeFeeBaseOreForDefaultSixPack: sekToOre(
      envNumber(
        env,
        "PALLET_COVERAGE_STRIPE_BASE_SEK_SIX_PACK",
        d.stripeFeeBaseSekForDefaultSixPack,
      ),
    ),
    instabeeOrePerOrder: sekToOre(
      envNumber(
        env,
        "PALLET_COVERAGE_INSTABEE_SEK_PER_ORDER",
        d.instabeeSekPerOrder,
      ),
    ),
    fixedPalletCostOre: sekToOre(
      envNumber(
        env,
        "PALLET_COVERAGE_FIXED_PALLET_COST_SEK",
        d.fixedPalletCostSek,
      ),
    ),
    bottleCap: envInt(env, "PALLET_COVERAGE_BOTTLE_CAP", d.bottleCap),
    coverage150FromDay: envInt(
      env,
      "PALLET_COVERAGE_DAY_150",
      d.thresholdDayStarts.coverage150FromDay,
    ),
    coverage100FromDay: envInt(
      env,
      "PALLET_COVERAGE_DAY_100",
      d.thresholdDayStarts.coverage100FromDay,
    ),
    coverageFloorFromDay: envInt(
      env,
      "PALLET_COVERAGE_DAY_FLOOR",
      d.thresholdDayStarts.coverageFloorFromDay,
    ),
    coverage150: envNumber(env, "PALLET_COVERAGE_RATIO_150", d.coverage150),
    coverage100: envNumber(env, "PALLET_COVERAGE_RATIO_100", d.coverage100),
    coverageFloor: envNumber(env, "PALLET_COVERAGE_RATIO_FLOOR", d.coverageFloor),
    maxLossPerPalletOre,
    lockWeekday: envInt(env, "PALLET_COVERAGE_LOCK_WEEKDAY", d.lockWeekday) % 7,
    soldOutChoiceReplyDays: envInt(
      env,
      "PALLET_COVERAGE_SOLD_OUT_CHOICE_DAYS",
      d.soldOutChoiceReplyDays,
    ),
    enabled: envBool(env, "PALLET_COVERAGE_CLOSE_ENABLED", false),
    sendEmail: envBool(env, "PALLET_COVERAGE_CLOSE_SEND_EMAIL", false),
  };
}

/** Reference contribution-before-pallet-cost (öre) for one default 6-pack. */
export function defaultSixPackContributionBeforePalletOre(
  cfg: PalletCoverageCloseConfig = getPalletCoverageCloseConfig({}),
): number {
  const wine = cfg.wineMarginOrePerBottle * 6;
  const stripe = Math.round(
    cfg.stripeFeePercent * cfg.stripeFeeBaseOreForDefaultSixPack +
      cfg.stripeFeeFixedOre,
  );
  return wine - cfg.eprOrePerOrder + cfg.shippingIncomeExVatOrePerOrder - stripe;
}
