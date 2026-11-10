/**
 * Sold-out at lock time (Axel 2026-11-11 00:30).
 *
 * Wine is purchased only when the pallet locks. If a wine is unavailable:
 * (a) customer picks a replacement, or
 * (b) the line is removed and not charged.
 *
 * Admin marks a wine unavailable on a locked/scheduled pallet → affected
 * lines enter pending_choice. No answer → (b) remove and don't charge
 * (Axel confirmed 2026-11-11 00:41).
 */

import {
  getPalletCoverageCloseConfig,
  type PalletCoverageCloseConfig,
} from "@/lib/pallet-coverage-close/config";

export const SOLD_OUT_LINE_STATES = [
  "ok",
  "pending_choice",
  "replaced",
  "removed",
] as const;

export type SoldOutLineState = (typeof SOLD_OUT_LINE_STATES)[number];

export type SoldOutLineSnapshot = {
  lineId: string;
  wineId: string;
  quantity: number;
  /** Original line amount in öre (what would have been charged). */
  originalAmountOre: number;
  state: SoldOutLineState;
  /** Replacement wine id when state === replaced. */
  replacementWineId?: string | null;
  /** Replacement line amount in öre when replaced. */
  replacementAmountOre?: number | null;
};

export type SoldOutChoice = "replace" | "remove";

export type ChargeAdjustmentInput = {
  /** Original order total öre before sold-out adjustments. */
  originalOrderAmountOre: number;
  lines: SoldOutLineSnapshot[];
};

export type ChargeAdjustmentResult = {
  chargeAmountOre: number;
  removedAmountOre: number;
  /** Positive only when customer picked a pricier replacement. */
  replacementDeltaOre: number;
  pendingChoiceLineIds: string[];
};

/**
 * Charge = original − removed originals − replaced originals + replacement amounts.
 * Equivalent: original − removed + sum(max(0, replacement − original)) for replaces
 * when cheaper replacements still swap to the lower price.
 *
 * Spec: "original amount minus removed lines, plus any price difference only
 * if the customer actively picks a pricier wine." Cheaper replacements charge
 * the replacement amount (not the higher original).
 */
export function computeChargeAfterSoldOutChoices(
  input: ChargeAdjustmentInput,
): ChargeAdjustmentResult {
  const original = Math.max(0, Math.round(input.originalOrderAmountOre));
  let removedAmountOre = 0;
  let replacementDeltaOre = 0;
  let replacementChargeOre = 0;
  const pendingChoiceLineIds: string[] = [];

  for (const line of input.lines) {
    if (line.state === "pending_choice") {
      pendingChoiceLineIds.push(line.lineId);
      continue;
    }
    if (line.state === "removed") {
      removedAmountOre += Math.max(0, Math.round(line.originalAmountOre));
      continue;
    }
    if (line.state === "replaced") {
      const originalLine = Math.max(0, Math.round(line.originalAmountOre));
      const replacement = Math.max(
        0,
        Math.round(Number(line.replacementAmountOre) || 0),
      );
      removedAmountOre += originalLine;
      replacementChargeOre += replacement;
      if (replacement > originalLine) {
        replacementDeltaOre += replacement - originalLine;
      }
    }
  }

  const chargeAmountOre = Math.max(
    0,
    original - removedAmountOre + replacementChargeOre,
  );

  return {
    chargeAmountOre,
    removedAmountOre,
    replacementDeltaOre,
    pendingChoiceLineIds,
  };
}

export function applySoldOutChoice(input: {
  line: SoldOutLineSnapshot;
  choice: SoldOutChoice;
  replacementWineId?: string | null;
  replacementAmountOre?: number | null;
}): SoldOutLineSnapshot {
  if (input.choice === "remove") {
    return {
      ...input.line,
      state: "removed",
      replacementWineId: null,
      replacementAmountOre: null,
    };
  }
  return {
    ...input.line,
    state: "replaced",
    replacementWineId: input.replacementWineId ?? null,
    replacementAmountOre:
      input.replacementAmountOre != null
        ? Math.round(Number(input.replacementAmountOre))
        : null,
  };
}

/**
 * Mark lines for a wine as pending_choice (admin unavailable).
 * Only lines still `ok` are flipped.
 */
export function markWineUnavailableOnLines(
  lines: SoldOutLineSnapshot[],
  wineId: string,
): SoldOutLineSnapshot[] {
  return lines.map((line) =>
    line.wineId === wineId && line.state === "ok"
      ? { ...line, state: "pending_choice" as const }
      : line,
  );
}

/**
 * No customer answer → remove the wine and don't charge (Axel 00:41).
 */
export function applySoldOutChoiceTimeout(
  lines: SoldOutLineSnapshot[],
): SoldOutLineSnapshot[] {
  return lines.map((line) =>
    line.state === "pending_choice"
      ? {
          ...line,
          state: "removed" as const,
          replacementWineId: null,
          replacementAmountOre: null,
        }
      : line,
  );
}

export function soldOutChoiceDeadlineAt(
  from: Date,
  cfg: PalletCoverageCloseConfig = getPalletCoverageCloseConfig({}),
): Date {
  return new Date(
    from.getTime() + cfg.soldOutChoiceReplyDays * 24 * 60 * 60 * 1000,
  );
}

export function isSoldOutChoicePastDeadline(
  replyBy: Date | string,
  now: Date = new Date(),
): boolean {
  return now.getTime() > new Date(replyBy).getTime();
}
