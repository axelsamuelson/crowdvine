/**
 * Completeness / warning classification for Finance actuals.
 * Never substitutes missing costs with silent zeros in reported "known" margins.
 */

import type {
  FinanceCompletenessStatus,
  FinanceWarning,
  FinanceWarningCode,
} from "@/lib/finance/types";
import type { UnitEconomicsSnapshot } from "@/lib/pallet-contribution";

export type SnapshotCompleteness = {
  status: FinanceCompletenessStatus;
  warnings: FinanceWarning[];
  /** True when row may be included in known GM1/GM2 rollups. */
  includeInKnownMargins: boolean;
};

function warn(
  code: FinanceWarningCode,
  message: string,
): FinanceWarning {
  return { code, message };
}

export function classifyUnitSnapshot(
  snapshot: unknown,
  quantity: number,
): SnapshotCompleteness {
  const qty = Math.max(0, Math.floor(quantity));
  if (!snapshot || typeof snapshot !== "object") {
    return {
      status: "missing",
      warnings: [
        warn("missing_snapshot", "No economics_snapshot on reservation item"),
      ],
      includeInKnownMargins: false,
    };
  }

  const s = snapshot as Partial<UnitEconomicsSnapshot> & {
    incomplete?: boolean;
    incomplete_reason?: string | null;
    outbound_cost_source?: string | null;
  };

  const warnings: FinanceWarning[] = [];
  let status: FinanceCompletenessStatus = "complete";

  if (s.incomplete === true) {
    status = "partial";
    warnings.push(
      warn(
        "incomplete_unit",
        s.incomplete_reason || "Unit snapshot marked incomplete",
      ),
    );
    if (
      String(s.incomplete_reason || "")
        .toLowerCase()
        .includes("fx")
    ) {
      warnings.push(warn("missing_fx", s.incomplete_reason || "Missing FX"));
    }
    if (s.outbound_cost_source === "incomplete") {
      warnings.push(
        warn("missing_outbound", "Outbound carrier cost incomplete"),
      );
    }
  }

  const shipGross = Number(s.unit_shipping_revenue_gross_cents) || 0;
  const outbound = Number(s.unit_last_mile_cost_cents) || 0;
  if (shipGross === 0 && outbound > 0 && qty > 0) {
    status = status === "complete" ? "partial" : status;
    warnings.push(
      warn(
        "shipping_zero_with_outbound",
        "Customer shipping revenue is 0 while outbound carrier cost is positive — verify charge vs snapshot",
      ),
    );
  }

  const schema = Number(s.schema_version);
  if (!Number.isFinite(schema) || schema < 2) {
    status = "legacy";
    warnings.push(warn("legacy_snapshot", "Legacy or pre-v2 economics snapshot"));
  }

  // Incomplete units must not be treated as precise GM2 knowns
  const includeInKnownMargins = s.incomplete !== true;

  return { status, warnings, includeInKnownMargins };
}

export function mergeCompleteness(
  parts: SnapshotCompleteness[],
): {
  status: FinanceCompletenessStatus;
  warnings: FinanceWarning[];
  bottlesKnown: number;
  bottlesIncomplete: number;
} {
  const warningMap = new Map<string, FinanceWarning>();
  let bottlesKnown = 0;
  let bottlesIncomplete = 0;
  let anyMissing = false;
  let anyPartial = false;
  let anyLegacy = false;

  for (const p of parts) {
    for (const w of p.warnings) {
      warningMap.set(`${w.code}:${w.message}`, w);
    }
    if (p.status === "missing") anyMissing = true;
    if (p.status === "partial") anyPartial = true;
    if (p.status === "legacy") anyLegacy = true;
  }

  // Caller supplies bottle counts separately; this merges statuses only.
  void bottlesKnown;
  void bottlesIncomplete;

  let status: FinanceCompletenessStatus = "complete";
  if (anyMissing && !anyPartial && !anyLegacy) status = "missing";
  else if (anyMissing || anyPartial) status = "partial";
  else if (anyLegacy) status = "legacy";

  return {
    status,
    warnings: [...warningMap.values()],
    bottlesKnown: 0,
    bottlesIncomplete: 0,
  };
}

/**
 * Preferred aggregation policy for Finance actuals:
 * - Known economics: snapshots with includeInKnownMargins
 * - Incomplete economics: counted in bottles/revenue display with flags; excluded from margin totals
 * - Missing snapshots: bottlesIncomplete only
 */
export type AggregatePolicy = "known_margins_only";
