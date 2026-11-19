/**
 * Sold-out at lock time (Axel 2026-11-11 00:30 / 00:41 / 01:00).
 *
 * Wine is purchased only when the pallet locks. If a wine is unavailable:
 * packing rule — each producer/wholesaler packs boxes of 6 (mix OK within
 * source). See `lib/cart/packing-source.ts`.
 *
 * Choices:
 * - If removing the sold-out wine still leaves every source at a multiple of 6:
 *   (a) replace (same source) or (b) remove and don't charge.
 * - If removal would break a source's multiple of 6:
 *   (1) replace from the same source, or (2) cancel the whole order (nothing
 *   charged; bottles leave the pallet).
 *
 * No answer before the deadline:
 * - If removal works → remove the wine.
 * - Otherwise → cancel the whole order without charge.
 */

import {
  getPalletCoverageCloseConfig,
  type PalletCoverageCloseConfig,
} from "@/lib/pallet-coverage-close/config";
import {
  computePackingSourceProgress,
  resolvePackingSourceId,
  type PackingSourceInput,
} from "@/lib/cart/packing-source";

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
  /** Packing identity — producer uuid or wholesaler source_name key. */
  packingSourceId: string;
  sourceType?: string | null;
  sourceName?: string | null;
  producerId?: string | null;
};

export type SoldOutChoice = "replace" | "remove" | "cancel_order";

export type SoldOutAllowedChoices = {
  canRemove: boolean;
  /** Choices offered to the customer for this pending line. */
  choices: SoldOutChoice[];
};

export type ChargeAdjustmentInput = {
  /** Original order total öre before sold-out adjustments. */
  originalOrderAmountOre: number;
  lines: SoldOutLineSnapshot[];
  /** When true, nothing is charged (whole order cancelled for packing). */
  orderCancelled?: boolean;
};

export type ChargeAdjustmentResult = {
  chargeAmountOre: number;
  removedAmountOre: number;
  /** Positive only when customer picked a pricier replacement. */
  replacementDeltaOre: number;
  pendingChoiceLineIds: string[];
  orderCancelled: boolean;
};

export type SoldOutTimeoutResult = {
  /** remove = strip pending wines; cancel_order = whole order, charge 0. */
  outcome: "remove" | "cancel_order";
  lines: SoldOutLineSnapshot[];
  orderCancelled: boolean;
};

export function packingSourceIdForWine(input: PackingSourceInput): string {
  return resolvePackingSourceId(input);
}

export function withPackingSource(
  line: Omit<SoldOutLineSnapshot, "packingSourceId"> &
    Partial<Pick<SoldOutLineSnapshot, "packingSourceId">> &
    PackingSourceInput,
): SoldOutLineSnapshot {
  const packingSourceId =
    line.packingSourceId ??
    resolvePackingSourceId({
      sourceType: line.sourceType,
      sourceName: line.sourceName,
      producerId: line.producerId,
    });
  return { ...line, packingSourceId };
}

/** Bottles that still count toward packing (removed lines drop out). */
export function packingBottleCount(line: SoldOutLineSnapshot): number {
  if (line.state === "removed") return 0;
  return Math.max(0, Math.floor(Number(line.quantity) || 0));
}

/**
 * After dropping the given line ids (as removed), are all remaining
 * packing sources empty or a multiple of 6?
 * Empty order (no bottles left) is treated as packing-valid for the
 * remove path (customer may clear the last wine via remove when alone).
 */
export function isPackingValidWithoutLines(
  lines: ReadonlyArray<SoldOutLineSnapshot>,
  removeLineIds: ReadonlyArray<string>,
): boolean {
  const drop = new Set(removeLineIds);
  const remaining = lines
    .filter((l) => !drop.has(l.lineId) && packingBottleCount(l) > 0)
    .map((l) => ({
      quantity: packingBottleCount(l),
      sourceType: l.sourceType,
      sourceName: l.sourceName,
      producerId: l.producerId,
      // Prefer explicit packingSourceId via synthetic producer/wholesaler key
      // by reusing stored fields; when only packingSourceId is set, encode it.
      displayName: undefined as string | undefined,
    }));

  // If callers only set packingSourceId, rebuild inputs from it.
  const withIds = lines
    .filter((l) => !drop.has(l.lineId) && packingBottleCount(l) > 0)
    .map((l) => {
      if (l.sourceType || l.producerId || l.sourceName) {
        return {
          quantity: packingBottleCount(l),
          sourceType: l.sourceType,
          sourceName: l.sourceName,
          producerId: l.producerId,
        };
      }
      // Fall back: parse packingSourceId `producer:uuid` / `wholesaler:name`
      const [kind, ...rest] = l.packingSourceId.split(":");
      const key = rest.join(":");
      if (kind === "wholesaler") {
        return {
          quantity: packingBottleCount(l),
          sourceType: "wholesaler" as const,
          sourceName: key,
        };
      }
      return {
        quantity: packingBottleCount(l),
        sourceType: "producer" as const,
        producerId: key,
      };
    });

  void remaining;
  if (withIds.length === 0) return true;
  return computePackingSourceProgress(withIds).every((row) => row.isValid);
}

/**
 * Whether the customer may remove this pending sold-out line without
 * breaking the 6-per-source packing rule for the rest of the order.
 */
export function canRemoveSoldOutLine(
  lines: ReadonlyArray<SoldOutLineSnapshot>,
  lineId: string,
): boolean {
  const line = lines.find((l) => l.lineId === lineId);
  if (!line) return false;
  // Also drop other pending lines for the same wine (admin marks wine, not line).
  const removeIds = lines
    .filter(
      (l) =>
        l.wineId === line.wineId &&
        (l.state === "pending_choice" || l.lineId === lineId),
    )
    .map((l) => l.lineId);
  return isPackingValidWithoutLines(lines, removeIds);
}

export function resolveSoldOutAllowedChoices(
  lines: ReadonlyArray<SoldOutLineSnapshot>,
  pendingLineId: string,
): SoldOutAllowedChoices {
  const canRemove = canRemoveSoldOutLine(lines, pendingLineId);
  if (canRemove) {
    return { canRemove: true, choices: ["replace", "remove"] };
  }
  return { canRemove: false, choices: ["replace", "cancel_order"] };
}

/**
 * Replacement must stay on the same packing source (same producer or wholesaler).
 */
export function isReplacementSamePackingSource(
  line: SoldOutLineSnapshot,
  replacement: PackingSourceInput,
): boolean {
  return (
    line.packingSourceId ===
    resolvePackingSourceId({
      sourceType: replacement.sourceType,
      sourceName: replacement.sourceName,
      producerId: replacement.producerId,
    })
  );
}

/**
 * Charge = original − removed originals − replaced originals + replacement amounts.
 * Cancelled order → 0.
 *
 * Spec: "original amount minus removed lines, plus any price difference only
 * if the customer actively picks a pricier wine." Cheaper replacements charge
 * the replacement amount (not the higher original).
 */
export function computeChargeAfterSoldOutChoices(
  input: ChargeAdjustmentInput,
): ChargeAdjustmentResult {
  if (input.orderCancelled) {
    return {
      chargeAmountOre: 0,
      removedAmountOre: Math.max(0, Math.round(input.originalOrderAmountOre)),
      replacementDeltaOre: 0,
      pendingChoiceLineIds: [],
      orderCancelled: true,
    };
  }

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
    orderCancelled: false,
  };
}

export function applySoldOutChoice(input: {
  line: SoldOutLineSnapshot;
  choice: Exclude<SoldOutChoice, "cancel_order">;
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
 * Apply a customer choice with packing enforcement.
 * - remove rejected when packing would break → error
 * - replace requires same packing source when replacement meta is provided
 * - cancel_order marks every line removed and flags orderCancelled
 */
export function applySoldOutCustomerDecision(input: {
  lines: SoldOutLineSnapshot[];
  lineId: string;
  choice: SoldOutChoice;
  replacementWineId?: string | null;
  replacementAmountOre?: number | null;
  replacementPacking?: PackingSourceInput | null;
}):
  | {
      ok: true;
      lines: SoldOutLineSnapshot[];
      orderCancelled: boolean;
    }
  | { ok: false; message: string } {
  const { lines, lineId, choice } = input;
  const line = lines.find((l) => l.lineId === lineId);
  if (!line) return { ok: false, message: "Line not found" };
  if (line.state !== "pending_choice") {
    return { ok: false, message: "Line is not awaiting a choice" };
  }

  const allowed = resolveSoldOutAllowedChoices(lines, lineId);
  if (!allowed.choices.includes(choice)) {
    return {
      ok: false,
      message: allowed.canRemove
        ? "Choice must be replace or remove"
        : "Removal would break the 6-bottle packing rule — replace from the same source or cancel the order",
    };
  }

  if (choice === "cancel_order") {
    return {
      ok: true,
      orderCancelled: true,
      lines: lines.map((l) => ({
        ...l,
        state: "removed" as const,
        replacementWineId: null,
        replacementAmountOre: null,
      })),
    };
  }

  if (choice === "replace" && input.replacementPacking) {
    if (!isReplacementSamePackingSource(line, input.replacementPacking)) {
      return {
        ok: false,
        message: "Replacement must be from the same producer or wholesaler",
      };
    }
  }

  const nextLine = applySoldOutChoice({
    line,
    choice,
    replacementWineId: input.replacementWineId,
    replacementAmountOre: input.replacementAmountOre,
  });

  return {
    ok: true,
    orderCancelled: false,
    lines: lines.map((l) => (l.lineId === lineId ? nextLine : l)),
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
 * No customer answer for the given pending line ids.
 * If removing them keeps packing valid → remove those lines.
 * Otherwise → cancel the whole order (all lines removed, charge 0).
 */
export function applySoldOutChoiceTimeout(
  lines: SoldOutLineSnapshot[],
  pendingLineIds?: ReadonlyArray<string>,
): SoldOutTimeoutResult {
  const pendingIds =
    pendingLineIds && pendingLineIds.length > 0
      ? [...pendingLineIds]
      : lines.filter((l) => l.state === "pending_choice").map((l) => l.lineId);

  if (pendingIds.length === 0) {
    return { outcome: "remove", lines: [...lines], orderCancelled: false };
  }

  if (isPackingValidWithoutLines(lines, pendingIds)) {
    const drop = new Set(pendingIds);
    return {
      outcome: "remove",
      orderCancelled: false,
      lines: lines.map((line) =>
        drop.has(line.lineId) && line.state === "pending_choice"
          ? {
              ...line,
              state: "removed" as const,
              replacementWineId: null,
              replacementAmountOre: null,
            }
          : line,
      ),
    };
  }

  return {
    outcome: "cancel_order",
    orderCancelled: true,
    lines: lines.map((line) => ({
      ...line,
      state: "removed" as const,
      replacementWineId: null,
      replacementAmountOre: null,
    })),
  };
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
