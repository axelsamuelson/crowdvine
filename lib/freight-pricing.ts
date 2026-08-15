/**
 * Generic freight pricing engine (Phase 2B).
 *
 * Separates reusable rate-card maths from frozen pallet quote snapshots.
 * Amounts use integer minor units (EUR cents, SEK öre) for persistence.
 *
 * Rounding policy:
 * - Convert major → minor with Math.round(major * 100) when ingesting.
 * - Percentage components: Math.round(baseOrSubtotalMinor * percent / 100).
 * - Sum integer minor units (never compound % on %).
 * - Display: minor / 100 with 2 decimals.
 */

export const FREIGHT_CALCULATION_TYPES = [
  "FIXED",
  "PER_PALLET",
  "PER_KG",
  "PERCENT_OF_BASE",
  "PERCENT_OF_SUBTOTAL",
  "SPOT_QUOTE",
] as const;

export type FreightCalculationType = (typeof FREIGHT_CALCULATION_TYPES)[number];

export const FREIGHT_COMPONENT_KINDS = [
  "SURCHARGE",
  "ADD_ON",
  "FEE",
  "OTHER",
] as const;

export type FreightComponentKind = (typeof FREIGHT_COMPONENT_KINDS)[number];

export type FreightComponentInput = {
  id?: string;
  name: string;
  code?: string | null;
  componentKind?: FreightComponentKind;
  calculationType: FreightCalculationType;
  /** Major units for FIXED/PER_*, percent points for PERCENT_*, null for unknown/spot. */
  value: number | null;
  currency?: string | null;
  isMandatory?: boolean;
  isOptional?: boolean;
  sortOrder?: number;
  /** When selected optional add-on or spot component has a supplied amount (major). */
  suppliedAmountMajor?: number | null;
  /** Include optional components only when selected. */
  selected?: boolean;
};

export type FreightPricingInput = {
  currency: string;
  /** Base in major currency units (e.g. 308 EUR). Null for spot-only rates. */
  baseAmountMajor: number | null;
  unitType?: "FIXED" | "PER_PALLET" | "PER_KG" | "SPOT_QUOTE";
  palletCount?: number;
  weightKg?: number | null;
  components: FreightComponentInput[];
  /** Spot amount for the whole service when rate/service is SPOT_QUOTE. */
  serviceSpotAmountMajor?: number | null;
  servicePricingType?: "RATE_CARD" | "SPOT_QUOTE";
};

export type FreightQuoteComponentLine = {
  id?: string;
  name: string;
  code?: string | null;
  calculationType: FreightCalculationType;
  componentKind?: FreightComponentKind;
  /** Percent points or major unit rate from catalogue. */
  catalogueValue: number | null;
  amountMinor: number | null;
  selected: boolean;
  isMandatory: boolean;
  isOptional: boolean;
  missingAmount: boolean;
};

export type FreightQuoteBreakdown = {
  currency: string;
  baseAmountMinor: number | null;
  components: FreightQuoteComponentLine[];
  /** Base + all resolved component amounts (integer minor). */
  subtotalAmountMinor: number | null;
  /** Alias major units for display helpers. */
  baseAmount: number | null;
  subtotalAmount: number | null;
  componentsMajor: Array<{
    name: string;
    calculationType: string;
    amount: number | null;
  }>;
  requiresSpotQuote: boolean;
  canCalculate: boolean;
};

export function majorToMinor(major: number): number {
  return Math.round(Number(major) * 100);
}

export function minorToMajor(minor: number): number {
  return Math.round(Number(minor)) / 100;
}

/** Round percentage of an integer minor amount → integer minor. */
export function percentOfMinor(baseMinor: number, percentPoints: number): number {
  return Math.round((baseMinor * Number(percentPoints)) / 100);
}

function isPercentageType(t: FreightCalculationType): boolean {
  return t === "PERCENT_OF_BASE" || t === "PERCENT_OF_SUBTOTAL";
}

/**
 * Pure freight breakdown calculator.
 *
 * Order:
 * 1. Resolve base (or service spot).
 * 2. Resolve non-percentage components (FIXED / PER_PALLET / PER_KG / SPOT with amount).
 * 3. Apply PERCENT_OF_BASE against original base.
 * 4. Apply PERCENT_OF_SUBTOTAL against (base + non-percentage components).
 * Never apply percentage-on-percentage.
 */
export function calculateFreightQuoteBreakdown(
  input: FreightPricingInput,
): FreightQuoteBreakdown {
  const currency = (input.currency || "EUR").toUpperCase();
  const palletCount = Math.max(1, Math.floor(Number(input.palletCount) || 1));
  const weightKg =
    input.weightKg != null && Number.isFinite(Number(input.weightKg))
      ? Number(input.weightKg)
      : null;

  let requiresSpotQuote = false;
  let canCalculate = true;

  let baseAmountMinor: number | null = null;

  if (input.servicePricingType === "SPOT_QUOTE") {
    if (
      input.serviceSpotAmountMajor == null ||
      !Number.isFinite(Number(input.serviceSpotAmountMajor))
    ) {
      requiresSpotQuote = true;
      canCalculate = false;
      baseAmountMinor = null;
    } else {
      baseAmountMinor = majorToMinor(Number(input.serviceSpotAmountMajor));
    }
  } else if (
    input.baseAmountMajor == null ||
    !Number.isFinite(Number(input.baseAmountMajor))
  ) {
    if (
      input.serviceSpotAmountMajor != null &&
      Number.isFinite(Number(input.serviceSpotAmountMajor))
    ) {
      baseAmountMinor = majorToMinor(Number(input.serviceSpotAmountMajor));
    } else {
      requiresSpotQuote = true;
      canCalculate = false;
    }
  } else {
    baseAmountMinor = majorToMinor(Number(input.baseAmountMajor));
  }

  const sorted = [...input.components].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  const lines: FreightQuoteComponentLine[] = [];
  let nonPercentSumMinor = 0;

  for (const c of sorted) {
    const isOptional = c.isOptional === true;
    const isMandatory = isOptional
      ? false
      : c.isMandatory === true || c.isMandatory !== false;
    const selected = isOptional ? c.selected === true : true;

    if (isOptional && !selected) {
      lines.push({
        id: c.id,
        name: c.name,
        code: c.code,
        calculationType: c.calculationType,
        componentKind: c.componentKind,
        catalogueValue: c.value,
        amountMinor: null,
        selected: false,
        isMandatory: false,
        isOptional: true,
        missingAmount: false,
      });
      continue;
    }

    let amountMinor: number | null = null;
    let missingAmount = false;

    if (c.calculationType === "SPOT_QUOTE") {
      if (
        c.suppliedAmountMajor == null ||
        !Number.isFinite(Number(c.suppliedAmountMajor))
      ) {
        missingAmount = true;
        requiresSpotQuote = true;
        if (isMandatory || selected) canCalculate = false;
      } else {
        amountMinor = majorToMinor(Number(c.suppliedAmountMajor));
      }
    } else if (
      c.calculationType === "FIXED" ||
      c.calculationType === "PER_PALLET" ||
      c.calculationType === "PER_KG"
    ) {
      if (c.value == null || !Number.isFinite(Number(c.value))) {
        missingAmount = true;
        if (isMandatory || selected) canCalculate = false;
      } else if (c.calculationType === "FIXED") {
        amountMinor = majorToMinor(Number(c.value));
      } else if (c.calculationType === "PER_PALLET") {
        amountMinor = majorToMinor(Number(c.value) * palletCount);
      } else {
        // PER_KG
        if (weightKg == null) {
          missingAmount = true;
          if (isMandatory || selected) canCalculate = false;
        } else {
          amountMinor = majorToMinor(Number(c.value) * weightKg);
        }
      }
    }
    // Percentages resolved in second pass

    lines.push({
      id: c.id,
      name: c.name,
      code: c.code,
      calculationType: c.calculationType,
      componentKind: c.componentKind,
      catalogueValue: c.value,
      amountMinor: isPercentageType(c.calculationType) ? null : amountMinor,
      selected,
      isMandatory,
      isOptional,
      missingAmount: isPercentageType(c.calculationType) ? false : missingAmount,
    });

    if (
      !isPercentageType(c.calculationType) &&
      amountMinor != null &&
      !missingAmount
    ) {
      nonPercentSumMinor += amountMinor;
    }
  }

  // Second pass: percentages
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const src = sorted[i]!;
    if (!line.selected && line.isOptional) continue;
    if (!isPercentageType(line.calculationType)) continue;

    if (
      src.value == null ||
      !Number.isFinite(Number(src.value)) ||
      baseAmountMinor == null
    ) {
      line.missingAmount = true;
      canCalculate = false;
      continue;
    }

    if (line.calculationType === "PERCENT_OF_BASE") {
      line.amountMinor = percentOfMinor(baseAmountMinor, Number(src.value));
    } else {
      // PERCENT_OF_SUBTOTAL = % of (base + non-percentage components only)
      const subtotalBase = baseAmountMinor + nonPercentSumMinor;
      line.amountMinor = percentOfMinor(subtotalBase, Number(src.value));
    }
  }

  if (!canCalculate || baseAmountMinor == null) {
    return {
      currency,
      baseAmountMinor,
      components: lines,
      subtotalAmountMinor: null,
      baseAmount: baseAmountMinor != null ? minorToMajor(baseAmountMinor) : null,
      subtotalAmount: null,
      componentsMajor: lines.map((l) => ({
        name: l.name,
        calculationType: l.calculationType,
        amount: l.amountMinor != null ? minorToMajor(l.amountMinor) : null,
      })),
      requiresSpotQuote,
      canCalculate: false,
    };
  }

  let subtotal = baseAmountMinor;
  for (const line of lines) {
    if (line.amountMinor != null && (line.selected || line.isMandatory)) {
      subtotal += line.amountMinor;
    }
  }

  return {
    currency,
    baseAmountMinor,
    components: lines,
    subtotalAmountMinor: subtotal,
    baseAmount: minorToMajor(baseAmountMinor),
    subtotalAmount: minorToMajor(subtotal),
    componentsMajor: lines.map((l) => ({
      name: l.name,
      calculationType: l.calculationType,
      amount: l.amountMinor != null ? minorToMajor(l.amountMinor) : null,
    })),
    requiresSpotQuote,
    canCalculate: true,
  };
}

export type WeightCompatibility = "UNKNOWN" | "COMPATIBLE" | "INCOMPATIBLE";

export function evaluateWeightCompatibility(opts: {
  maxWeightKg?: number | null;
  actualWeightKg?: number | null;
}): WeightCompatibility {
  if (opts.actualWeightKg == null || !Number.isFinite(Number(opts.actualWeightKg))) {
    return "UNKNOWN";
  }
  if (opts.maxWeightKg == null || !Number.isFinite(Number(opts.maxWeightKg))) {
    return "UNKNOWN";
  }
  return Number(opts.actualWeightKg) <= Number(opts.maxWeightKg)
    ? "COMPATIBLE"
    : "INCOMPATIBLE";
}

/**
 * Convert a calculable foreign-currency total to SEK öre using a frozen FX rate.
 * Returns null if FX missing/invalid — never assumes FX = 1 for non-SEK.
 */
export function convertFreightTotalToSekCents(opts: {
  currency: string;
  totalAmountMinor: number | null;
  fxRateToSek: number | null | undefined;
}): number | null {
  if (opts.totalAmountMinor == null || !Number.isFinite(opts.totalAmountMinor)) {
    return null;
  }
  const currency = (opts.currency || "").toUpperCase();
  if (currency === "SEK") {
    return Math.round(opts.totalAmountMinor);
  }
  const fx = Number(opts.fxRateToSek);
  if (!Number.isFinite(fx) || fx <= 0) return null;
  // totalAmountMinor is in foreign minor units; major * fx * 100 = SEK öre
  const major = opts.totalAmountMinor / 100;
  return Math.round(major * fx * 100);
}

export function isFreightQuoteEconomicallyUsable(opts: {
  canCalculate: boolean;
  totalCostSekCents: number | null;
  weightCompatibility?: WeightCompatibility;
}): boolean {
  if (!opts.canCalculate) return false;
  if (opts.totalCostSekCents == null || opts.totalCostSekCents <= 0) return false;
  if (opts.weightCompatibility === "INCOMPATIBLE") return false;
  return true;
}

/** Hillebrand July sea components helper for tests/docs. */
export function hillebrandSeaJulyComponents(): FreightComponentInput[] {
  return [
    {
      id: "fuel",
      name: "Fuel surcharge",
      code: "FUEL",
      calculationType: "PERCENT_OF_BASE",
      value: 17.1,
      isMandatory: true,
      sortOrder: 10,
    },
    {
      id: "emergency_fuel",
      name: "Emergency fuel surcharge",
      code: "EMERGENCY_FUEL",
      calculationType: "PERCENT_OF_BASE",
      value: 8.6,
      isMandatory: true,
      sortOrder: 20,
    },
    {
      id: "cover",
      name: "Pallet cover",
      code: "PALLET_COVER",
      calculationType: "SPOT_QUOTE",
      value: null,
      isOptional: true,
      selected: false,
      sortOrder: 30,
    },
    {
      id: "cooling",
      name: "Cooling / refrigerated transport",
      code: "COOLING",
      calculationType: "SPOT_QUOTE",
      value: null,
      isOptional: true,
      selected: false,
      sortOrder: 40,
    },
  ];
}
