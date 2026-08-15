/**
 * Outbound / Instabee (Budbee Light) freight pricing (Phase 2C+).
 *
 * Pure helpers — no DB. Money in integer öre (SEK cents).
 *
 * Budbee Light SE (catalogue):
 *   volumetric kg = L×W×H (m) × volumetricFactor, round UP to nearest 0.5 kg
 *   79 SEK for first 0.5 kg + 1 SEK per additional 0.5 kg
 *
 * Volumetric factor 280 is a CONFIGURABLE ASSUMPTION for Home Delivery
 * (appeared under Locker section in source PDF) — not independently verified.
 *
 * Do NOT apply max(actual, volumetric) unless pricing_basis says so.
 * Do NOT invent packaging dimensions or treat missing data as 0 SEK.
 */

export type OutboundPricingBasis =
  | "ACTUAL_WEIGHT"
  | "VOLUMETRIC_WEIGHT"
  | "MAX_ACTUAL_OR_VOLUMETRIC"
  | "FIXED_PER_PARCEL";

/** Machine-readable incomplete reasons (never collapse UNKNOWN → 0 SEK). */
export const OutboundIncompleteReasonCode = {
  MISSING_PACKAGING_DIMENSIONS: "MISSING_PACKAGING_DIMENSIONS",
  MISSING_PRODUCT_WEIGHT: "MISSING_PRODUCT_WEIGHT",
  MISSING_VOLUMETRIC_WEIGHT: "MISSING_VOLUMETRIC_WEIGHT",
  RATE_EXPIRED: "RATE_EXPIRED",
  NO_ACTIVE_RATE: "NO_ACTIVE_RATE",
  DESTINATION_NOT_COVERED: "DESTINATION_NOT_COVERED",
  NO_BOTTLES: "NO_BOTTLES",
  PARCEL_COUNT_UNRESOLVED: "PARCEL_COUNT_UNRESOLVED",
  UNKNOWN_PRICING_BASIS: "UNKNOWN_PRICING_BASIS",
  BOTH_WEIGHTS_REQUIRED: "BOTH_WEIGHTS_REQUIRED",
} as const;

export type OutboundIncompleteReasonCode =
  (typeof OutboundIncompleteReasonCode)[keyof typeof OutboundIncompleteReasonCode];

export function classifyOutboundIncompleteReason(
  reason: string,
): OutboundIncompleteReasonCode | null {
  const r = reason.toLowerCase();
  if (r.includes("packaging dimensions missing")) {
    return OutboundIncompleteReasonCode.MISSING_PACKAGING_DIMENSIONS;
  }
  if (r.includes("actual weight required")) {
    return OutboundIncompleteReasonCode.MISSING_PRODUCT_WEIGHT;
  }
  if (r.includes("volumetric weight required")) {
    return OutboundIncompleteReasonCode.MISSING_VOLUMETRIC_WEIGHT;
  }
  if (r.includes("rate expired") || r.includes("expired")) {
    return OutboundIncompleteReasonCode.RATE_EXPIRED;
  }
  if (r.includes("no active instabee") || r.includes("missing or expired")) {
    return OutboundIncompleteReasonCode.NO_ACTIVE_RATE;
  }
  if (r.includes("not covered by rate")) {
    return OutboundIncompleteReasonCode.DESTINATION_NOT_COVERED;
  }
  if (r.includes("no bottles")) {
    return OutboundIncompleteReasonCode.NO_BOTTLES;
  }
  if (r.includes("parcel count")) {
    return OutboundIncompleteReasonCode.PARCEL_COUNT_UNRESOLVED;
  }
  if (r.includes("unknown pricing basis")) {
    return OutboundIncompleteReasonCode.UNKNOWN_PRICING_BASIS;
  }
  if (r.includes("both actual and volumetric")) {
    return OutboundIncompleteReasonCode.BOTH_WEIGHTS_REQUIRED;
  }
  return null;
}

export function incompleteReasonCodesFromMessages(
  reasons: string[],
): OutboundIncompleteReasonCode[] {
  const codes: OutboundIncompleteReasonCode[] = [];
  for (const reason of reasons) {
    const code = classifyOutboundIncompleteReason(reason);
    if (code && !codes.includes(code)) codes.push(code);
  }
  return codes;
}
export type OutboundSurchargeInput = {
  code: string;
  name: string;
  /** öre per parcel (or per pickup when calculation is PER_PICKUP). */
  amountCentsPerUnit: number;
  calculationType: "PER_PARCEL" | "PER_PICKUP" | "FIXED";
  /** Must be explicitly selected to apply at estimate time. */
  selected?: boolean;
  /**
   * When true, never apply for the given destination (e.g. REMOTE_AREA_* for SE).
   */
  blockedForDestination?: boolean;
};

export type OutboundRateCard = {
  currency: string;
  /** öre */
  basePriceCents: number;
  includedWeightKg: number;
  weightIncrementKg: number;
  /** öre per increment */
  incrementPriceCents: number;
  pricingBasis: OutboundPricingBasis;
  volumetricFactor: number;
  validTo?: string | null;
  destinationCountry?: string | null;
};

export type OutboundFreightQuoteBreakdown = {
  currency: string;
  parcelCount: number;
  actualWeightKg: number | null;
  volumetricWeightKg: number | null;
  roundedVolumetricWeightKg: number | null;
  chargeableWeightKg: number | null;
  baseAmountCents: number | null;
  weightIncrementAmountCents: number | null;
  components: Array<{
    code: string;
    name: string;
    amountCents: number | null;
    applied: boolean;
  }>;
  totalAmountCents: number | null;
  canCalculate: boolean;
  incompleteReasons: string[];
  /** Structured codes derived from incompleteReasons (stable for admin/API). */
  incompleteReasonCodes: OutboundIncompleteReasonCode[];
};

/** Round UP to nearest 0.5 kg. */
export function roundUpToHalfKg(weightKg: number): number {
  const w = Number(weightKg);
  if (!Number.isFinite(w) || w <= 0) return 0.5; // minimum billable half-kg step when positive volume exists
  // Avoid float artefacts: work in half-kg units
  const halfUnits = w * 2;
  const ceil = Math.ceil(halfUnits - 1e-9);
  return ceil / 2;
}

export function volumetricWeightKgFromMeters(
  lengthM: number,
  widthM: number,
  heightM: number,
  factorKgPerM3: number = 280,
): number {
  return lengthM * widthM * heightM * factorKgPerM3;
}

export function volumetricWeightKgFromCm(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  factorKgPerM3: number = 280,
): number {
  const m3 = (lengthCm * widthCm * heightCm) / 1_000_000;
  return m3 * factorKgPerM3;
}

/**
 * Price one parcel for incremental volumetric (or configured basis) rate.
 * Returns öre.
 */
export function priceParcelIncrementalWeightCents(opts: {
  chargeableWeightKg: number;
  basePriceCents: number;
  includedWeightKg: number;
  weightIncrementKg: number;
  incrementPriceCents: number;
}): number {
  const {
    chargeableWeightKg,
    basePriceCents,
    includedWeightKg,
    weightIncrementKg,
    incrementPriceCents,
  } = opts;
  if (weightIncrementKg <= 0) return basePriceCents;
  if (chargeableWeightKg <= includedWeightKg + 1e-9) return basePriceCents;
  const additional = chargeableWeightKg - includedWeightKg;
  const steps = Math.round((additional / weightIncrementKg) * 1e6) / 1e6;
  // steps should be integer half-kg counts after rounding
  const stepCount = Math.max(0, Math.round(steps));
  return basePriceCents + stepCount * incrementPriceCents;
}

export function resolveParcelCount(opts: {
  bottleCount: number;
  maxBottlesPerParcel: number | null | undefined;
  explicitParcelCount?: number | null;
}): { parcelCount: number | null; reason?: string } {
  if (
    opts.explicitParcelCount != null &&
    Number.isFinite(opts.explicitParcelCount) &&
    opts.explicitParcelCount > 0
  ) {
    return { parcelCount: Math.floor(Number(opts.explicitParcelCount)) };
  }
  const bottles = Math.max(0, Math.floor(opts.bottleCount));
  if (bottles <= 0) return { parcelCount: null, reason: "No bottles" };
  const max = opts.maxBottlesPerParcel;
  if (max == null || !Number.isFinite(max) || max <= 0) {
    return {
      parcelCount: null,
      reason: "Parcel count unresolved (packaging max_bottles missing)",
    };
  }
  return { parcelCount: Math.ceil(bottles / Math.floor(max)) };
}

export function resolveChargeableWeightKg(opts: {
  pricingBasis: OutboundPricingBasis;
  actualWeightKg: number | null;
  roundedVolumetricWeightKg: number | null;
}): { weightKg: number | null; reason?: string } {
  switch (opts.pricingBasis) {
    case "FIXED_PER_PARCEL":
      return { weightKg: null };
    case "ACTUAL_WEIGHT":
      if (opts.actualWeightKg == null) {
        return { weightKg: null, reason: "Actual weight required but missing" };
      }
      return { weightKg: opts.actualWeightKg };
    case "VOLUMETRIC_WEIGHT":
      if (opts.roundedVolumetricWeightKg == null) {
        return {
          weightKg: null,
          reason: "Volumetric weight required but dimensions missing",
        };
      }
      return { weightKg: opts.roundedVolumetricWeightKg };
    case "MAX_ACTUAL_OR_VOLUMETRIC": {
      if (opts.actualWeightKg == null || opts.roundedVolumetricWeightKg == null) {
        return {
          weightKg: null,
          reason: "Both actual and volumetric weight required",
        };
      }
      return {
        weightKg: Math.max(opts.actualWeightKg, opts.roundedVolumetricWeightKg),
      };
    }
    default:
      return { weightKg: null, reason: `Unknown pricing basis` };
  }
}

/**
 * Sweden Instabee remote-area surcharges must never apply (footnote: Norway only).
 */
export function isRemoteAreaBlockedForCountry(
  componentCode: string,
  destinationCountry: string | null | undefined,
): boolean {
  const code = componentCode.toUpperCase();
  if (code !== "REMOTE_AREA_HOME" && code !== "REMOTE_AREA_BOX") return false;
  const cc = (destinationCountry || "").toUpperCase();
  return cc === "SE" || cc === "";
}

export function calculateOutboundFreightQuoteBreakdown(input: {
  rate: OutboundRateCard;
  destinationCountry: string;
  bottleCount: number;
  maxBottlesPerParcel?: number | null;
  explicitParcelCount?: number | null;
  lengthM?: number | null;
  widthM?: number | null;
  heightM?: number | null;
  actualWeightKg?: number | null;
  /** As-of date for offer validity (ISO date). Defaults to today UTC. */
  asOfDate?: string;
  surcharges?: OutboundSurchargeInput[];
  pickupCount?: number;
}): OutboundFreightQuoteBreakdown {
  const currency = (input.rate.currency || "SEK").toUpperCase();
  const incompleteReasons: string[] = [];
  const dest = (input.destinationCountry || "").toUpperCase();

  if (
    input.rate.destinationCountry &&
    dest &&
    dest !== input.rate.destinationCountry.toUpperCase()
  ) {
    incompleteReasons.push(
      `Destination ${dest} not covered by rate for ${input.rate.destinationCountry}`,
    );
  }

  if (input.rate.validTo) {
    const asOf = (input.asOfDate || new Date().toISOString().slice(0, 10)).slice(
      0,
      10,
    );
    if (asOf > input.rate.validTo.slice(0, 10)) {
      incompleteReasons.push(
        `Rate expired (valid_to ${input.rate.validTo}, asOf ${asOf})`,
      );
    }
  }

  const parcelRes = resolveParcelCount({
    bottleCount: input.bottleCount,
    maxBottlesPerParcel: input.maxBottlesPerParcel,
    explicitParcelCount: input.explicitParcelCount,
  });
  if (parcelRes.parcelCount == null) {
    incompleteReasons.push(parcelRes.reason || "Parcel count unresolved");
  }
  const parcelCount = parcelRes.parcelCount ?? 0;

  let volumetricWeightKg: number | null = null;
  let roundedVolumetricWeightKg: number | null = null;
  const L = input.lengthM;
  const W = input.widthM;
  const H = input.heightM;
  if (
    L != null &&
    W != null &&
    H != null &&
    Number.isFinite(L) &&
    Number.isFinite(W) &&
    Number.isFinite(H) &&
    L > 0 &&
    W > 0 &&
    H > 0
  ) {
    volumetricWeightKg = volumetricWeightKgFromMeters(
      L,
      W,
      H,
      input.rate.volumetricFactor || 280,
    );
    roundedVolumetricWeightKg = roundUpToHalfKg(volumetricWeightKg);
  } else if (input.rate.pricingBasis === "VOLUMETRIC_WEIGHT") {
    incompleteReasons.push(
      "Packaging dimensions missing (required for volumetric weight)",
    );
  }

  const actualWeightKg =
    input.actualWeightKg != null && Number.isFinite(input.actualWeightKg)
      ? Number(input.actualWeightKg)
      : null;

  const chargeable = resolveChargeableWeightKg({
    pricingBasis: input.rate.pricingBasis,
    actualWeightKg,
    roundedVolumetricWeightKg,
  });
  if (chargeable.reason) incompleteReasons.push(chargeable.reason);

  if (incompleteReasons.length > 0 || parcelCount <= 0) {
    return {
      currency,
      parcelCount,
      actualWeightKg,
      volumetricWeightKg,
      roundedVolumetricWeightKg,
      chargeableWeightKg: chargeable.weightKg,
      baseAmountCents: null,
      weightIncrementAmountCents: null,
      components: [],
      totalAmountCents: null,
      canCalculate: false,
      incompleteReasons,
      incompleteReasonCodes: incompleteReasonCodesFromMessages(incompleteReasons),
    };
  }

  let perParcelBase = 0;
  let perParcelIncrement = 0;

  if (input.rate.pricingBasis === "FIXED_PER_PARCEL") {
    perParcelBase = input.rate.basePriceCents;
  } else {
    const w = chargeable.weightKg!;
    const total = priceParcelIncrementalWeightCents({
      chargeableWeightKg: w,
      basePriceCents: input.rate.basePriceCents,
      includedWeightKg: input.rate.includedWeightKg,
      weightIncrementKg: input.rate.weightIncrementKg,
      incrementPriceCents: input.rate.incrementPriceCents,
    });
    perParcelBase = input.rate.basePriceCents;
    perParcelIncrement = total - input.rate.basePriceCents;
  }

  const baseAmountCents = perParcelBase * parcelCount;
  const weightIncrementAmountCents = perParcelIncrement * parcelCount;

  const components: OutboundFreightQuoteBreakdown["components"] = [];
  let surchargeTotal = 0;
  const pickupCount = Math.max(1, Math.floor(input.pickupCount ?? 1));

  for (const s of input.surcharges ?? []) {
    const blocked =
      s.blockedForDestination === true ||
      isRemoteAreaBlockedForCountry(s.code, dest);
    if (blocked) {
      components.push({
        code: s.code,
        name: s.name,
        amountCents: null,
        applied: false,
      });
      continue;
    }
    if (!s.selected) {
      components.push({
        code: s.code,
        name: s.name,
        amountCents: null,
        applied: false,
      });
      continue;
    }
    let amount = 0;
    if (s.calculationType === "PER_PARCEL") {
      amount = s.amountCentsPerUnit * parcelCount;
    } else if (s.calculationType === "PER_PICKUP") {
      amount = s.amountCentsPerUnit * pickupCount;
    } else {
      amount = s.amountCentsPerUnit;
    }
    components.push({
      code: s.code,
      name: s.name,
      amountCents: amount,
      applied: true,
    });
    surchargeTotal += amount;
  }

  const totalAmountCents =
    baseAmountCents + weightIncrementAmountCents + surchargeTotal;

  return {
    currency,
    parcelCount,
    actualWeightKg,
    volumetricWeightKg,
    roundedVolumetricWeightKg,
    chargeableWeightKg: chargeable.weightKg,
    baseAmountCents,
    weightIncrementAmountCents,
    components,
    totalAmountCents,
    canCalculate: true,
    incompleteReasons: [],
    incompleteReasonCodes: [],
  };
}

/**
 * Budbee Light Sweden rate card from Instabee offer (öre).
 * volumetricFactor 280 = CONFIGURABLE ASSUMPTION for Home (Locker-section evidence).
 * Tax/VAT basis = UNKNOWN.
 */
export function budbeeLightSwedenRateCard(): OutboundRateCard {
  return {
    currency: "SEK",
    basePriceCents: 7900,
    includedWeightKg: 0.5,
    weightIncrementKg: 0.5,
    incrementPriceCents: 100,
    pricingBasis: "VOLUMETRIC_WEIGHT",
    volumetricFactor: 280,
    validTo: "2026-08-18",
    destinationCountry: "SE",
  };
}

/** Provenance labels for Instabee Home catalogue fields (docs + admin). */
export const INSTABEE_HOME_FIELD_PROVENANCE = {
  basePriceCents: "VERIFIED",
  includedWeightKg: "VERIFIED",
  weightIncrementKg: "VERIFIED",
  incrementPriceCents: "VERIFIED",
  volumetricFactor: "ASSUMPTION",
  volumetricFactorNote:
    "Factor 280 appeared under Locker deliveries in source PDF; not independently verified for Home Delivery.",
  maxPackageWeightKg: "UNKNOWN",
  homeMaxDimensions: "UNKNOWN",
  taxVatBasis: "UNKNOWN",
  fuelIncluded: "VERIFIED",
  remoteAreaSweden: "VERIFIED",
  validTo: "VERIFIED",
  multiBoxCeilBottlesPerMax: "ASSUMPTION",
} as const;
