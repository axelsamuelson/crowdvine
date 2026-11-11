import { describe, expect, it } from "vitest";
import {
  defaultSixPackContributionBeforePalletOre,
  getPalletCoverageCloseConfig,
  PALLET_COVERAGE_CLOSE_DEFAULTS,
} from "@/lib/pallet-coverage-close/config";
import {
  computePalletCoverage,
  contributionBeforePalletForOrder,
} from "@/lib/pallet-coverage-close/coverage";
import {
  assertNeverBelowFloor,
  daysSinceFirstOrder,
  resolveCoverageThreshold,
} from "@/lib/pallet-coverage-close/threshold";
import {
  evaluateLockDecision,
  nextLockWeekdayUtc,
  recheckAtLockTime,
} from "@/lib/pallet-coverage-close/schedule";
import { ordersNeededForCoverageRatio } from "@/lib/pallet-coverage-close/progress-display";
import {
  applySoldOutChoice,
  applySoldOutChoiceTimeout,
  applySoldOutCustomerDecision,
  canRemoveSoldOutLine,
  computeChargeAfterSoldOutChoices,
  isReplacementSamePackingSource,
  markWineUnavailableOnLines,
  packingSourceIdForWine,
  resolveSoldOutAllowedChoices,
  withPackingSource,
  type SoldOutLineSnapshot,
  isSoldOutChoicePastDeadline,
  soldOutChoiceDeadlineAt,
} from "@/lib/pallet-coverage-close/sold-out-choice";
import {
  resolveOrderPalletAssignment,
  selectSingleOpenSharedPallet,
} from "@/lib/pallet-coverage-close/one-open-pallet";
import {
  buildPalletLockHeadsUpEmail,
  buildSoldOutChoiceEmail,
} from "@/lib/pallet-coverage-close/emails";
import {
  bottlesNeededForCurrentThreshold,
} from "@/lib/pallet-coverage-close/progress-display";
import {
  coverageCheckoutHint,
  coverageProgressLabel,
  coverageTermsPlaceholder,
} from "@/lib/pallet-coverage-close/customer-copy";
import {
  computePackingSourceProgress,
  PACK_BOTTLES_PER_SOURCE,
} from "@/lib/cart/packing-source";

function nSixPackOrders(n: number) {
  return Array.from({ length: n }, () => ({ bottleCount: 6 }));
}

describe("pallet coverage close config", () => {
  it("loads Ingrid defaults into CONFIG (not hardcoded at call sites)", () => {
    const cfg = getPalletCoverageCloseConfig({});
    expect(cfg.wineMarginOrePerBottle).toBe(
      Math.round(PALLET_COVERAGE_CLOSE_DEFAULTS.wineMarginSekPerBottle * 100),
    );
    expect(cfg.eprOrePerOrder).toBe(
      Math.round(PALLET_COVERAGE_CLOSE_DEFAULTS.eprSekPerOrder * 100),
    );
    expect(cfg.shippingIncomeExVatOrePerOrder).toBe(
      Math.round(
        PALLET_COVERAGE_CLOSE_DEFAULTS.shippingIncomeExVatSekPerOrder * 100,
      ),
    );
    expect(cfg.stripeFeePercent).toBe(0.015);
    expect(cfg.stripeFeeFixedOre).toBe(180);
    expect(cfg.instabeeOrePerOrder).toBe(8400);
    expect(cfg.fixedPalletCostOre).toBe(
      Math.round(PALLET_COVERAGE_CLOSE_DEFAULTS.fixedPalletCostSek * 100),
    );
    expect(cfg.bottleCap).toBe(600);
    expect(cfg.enabled).toBe(false);
    expect(cfg.sendEmail).toBe(false);
  });

  it("default 6-pack contribution before pallet ≈ 209.61 kr", () => {
    const ore = defaultSixPackContributionBeforePalletOre(
      getPalletCoverageCloseConfig({}),
    );
    expect(ore / 100).toBeCloseTo(209.61, 1);
  });
});

describe("coverage formula (Instabee in denominator only)", () => {
  const cfg = getPalletCoverageCloseConfig({});

  it("does not subtract Instabee in the numerator", () => {
    const one = contributionBeforePalletForOrder({ bottleCount: 6 }, cfg);
    expect(one.contributionBeforePalletOre).toBe(
      one.wineMarginOre -
        one.eprOre +
        one.shippingIncomeExVatOre -
        one.stripeFeeOre,
    );
    expect(one.contributionBeforePalletOre).not.toBe(
      one.wineMarginOre -
        one.eprOre +
        one.shippingIncomeExVatOre -
        one.stripeFeeOre -
        one.instabeeOre,
    );
  });

  it("uses real bottle counts (not assumed 6-pack) for wine margin", () => {
    const twelve = contributionBeforePalletForOrder({ bottleCount: 12 }, cfg);
    const six = contributionBeforePalletForOrder({ bottleCount: 6 }, cfg);
    expect(twelve.wineMarginOre).toBe(six.wineMarginOre * 2);
    expect(twelve.bottleCount).toBe(12);
  });

  it("reference: ~43 identical 6-packs ≈ 100% coverage", () => {
    const c43 = computePalletCoverage(nSixPackOrders(43), cfg);
    expect(c43.coverageRatio).toBeGreaterThan(0.98);
    expect(c43.coverageRatio).toBeLessThan(1.03);

    const needed = ordersNeededForCoverageRatio(
      1.0,
      defaultSixPackContributionBeforePalletOre(cfg),
      cfg,
    );
    expect(needed).toBe(43);
  });

  it("reference: ~25 identical 6-packs ≈ 70% coverage", () => {
    const c25 = computePalletCoverage(nSixPackOrders(25), cfg);
    expect(c25.coverageRatio).toBeGreaterThan(0.68);
    expect(c25.coverageRatio).toBeLessThan(0.73);

    const needed = ordersNeededForCoverageRatio(
      0.7,
      defaultSixPackContributionBeforePalletOre(cfg),
      cfg,
    );
    expect(needed).toBe(25);
  });

  it("reference: ~64 identical 6-packs ≈ 125% coverage (day-7 threshold)", () => {
    // 64 six-packs ≈ 124.9%; ceil to clear 125% is 65 — both count as ≈64.
    const c64 = computePalletCoverage(nSixPackOrders(64), cfg);
    expect(c64.coverageRatio).toBeGreaterThan(1.24);
    expect(c64.coverageRatio).toBeLessThan(1.26);

    const needed = ordersNeededForCoverageRatio(
      1.25,
      defaultSixPackContributionBeforePalletOre(cfg),
      cfg,
    );
    expect(needed).toBeGreaterThanOrEqual(64);
    expect(needed).toBeLessThanOrEqual(65);

    const atNeeded = computePalletCoverage(nSixPackOrders(needed), cfg);
    expect(atNeeded.coverageRatio).toBeGreaterThanOrEqual(1.25 - 0.001);
  });

  it("mixes non-6-pack orders in coverage", () => {
    const mixed = computePalletCoverage(
      [{ bottleCount: 3 }, { bottleCount: 9 }, { bottleCount: 6 }],
      cfg,
    );
    expect(mixed.orderCount).toBe(3);
    expect(mixed.bottleCount).toBe(18);
    expect(mixed.denominatorOre).toBe(
      cfg.fixedPalletCostOre + 3 * cfg.instabeeOrePerOrder,
    );
  });
});

describe("time-based thresholds", () => {
  const first = new Date("2026-01-01T00:00:00.000Z");
  const cfg = getPalletCoverageCloseConfig({});

  it("days 0–6: cap only", () => {
    for (const day of [0, 3, 6]) {
      const now = new Date(first.getTime() + day * 86400000);
      const t = resolveCoverageThreshold(first, now, cfg);
      expect(t.phase).toBe("cap_only");
      expect(t.requiredCoverage).toBeNull();
      expect(t.dayIndex).toBe(day);
    }
  });

  it("from day 7: 125%", () => {
    const t = resolveCoverageThreshold(
      first,
      new Date(first.getTime() + 7 * 86400000),
      cfg,
    );
    expect(t.phase).toBe("coverage_day7");
    expect(t.requiredCoverage).toBe(1.25);
    expect(cfg.coverageDay7).toBe(1.25);
  });

  it("from day 14: 100%", () => {
    const t = resolveCoverageThreshold(
      first,
      new Date(first.getTime() + 14 * 86400000),
      cfg,
    );
    expect(t.phase).toBe("coverage_100");
    expect(t.requiredCoverage).toBe(1.0);
  });

  it("from day 21: floor 70% — never below floor", () => {
    for (const day of [21, 30, 90]) {
      const t = resolveCoverageThreshold(
        first,
        new Date(first.getTime() + day * 86400000),
        cfg,
      );
      expect(t.phase).toBe("coverage_floor");
      expect(t.requiredCoverage).toBe(0.7);
      expect(assertNeverBelowFloor(t, cfg)).toBe(true);
    }
  });

  it("daysSinceFirstOrder floors whole days", () => {
    expect(
      daysSinceFirstOrder(first, new Date(first.getTime() + 1.9 * 86400000)),
    ).toBe(1);
  });
});

describe("locking: cap immediate + Monday schedule + re-check", () => {
  const cfg = getPalletCoverageCloseConfig({});
  const first = new Date("2026-01-01T12:00:00.000Z");

  it("locks immediately at bottle cap (600)", () => {
    const orders = [{ bottleCount: 600 }];
    const decision = evaluateLockDecision({
      orders,
      firstOrderAt: first,
      now: new Date(first.getTime() + 2 * 86400000),
      cfg,
    });
    expect(decision.action).toBe("lock_immediately");
    if (decision.action === "lock_immediately") {
      expect(decision.reason).toBe("bottle_cap");
    }
  });

  it("schedules next Monday when threshold met (not at cap)", () => {
    // Day 14 → 100% threshold; 43 six-packs ≈ 100%
    const now = new Date(first.getTime() + 14 * 86400000);
    // Thursday 2026-01-15
    expect(now.getUTCDay()).toBe(4);
    const decision = evaluateLockDecision({
      orders: nSixPackOrders(43),
      firstOrderAt: first,
      now,
      cfg,
    });
    expect(decision.action).toBe("schedule_lock");
    if (decision.action === "schedule_lock") {
      expect(decision.scheduledLockAt.getUTCDay()).toBe(cfg.lockWeekday);
      expect(decision.scheduledLockAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("nextLockWeekdayUtc skips to following week when already on weekday", () => {
    const monday = new Date("2026-01-05T10:00:00.000Z"); // Monday
    expect(monday.getUTCDay()).toBe(1);
    const next = nextLockWeekdayUtc(monday, 1);
    expect(next.getUTCDay()).toBe(1);
    expect(next.getTime()).toBeGreaterThan(monday.getTime());
  });

  it("re-check at lock time clears schedule when below threshold (cancellations)", () => {
    const now = new Date(first.getTime() + 14 * 86400000);
    const cleared = recheckAtLockTime({
      orders: nSixPackOrders(10),
      firstOrderAt: first,
      now,
      cfg,
    });
    expect(cleared.action).toBe("clear_schedule");
    expect(cleared.reason).toBe("below_threshold_at_recheck");
  });

  it("re-check locks when still at/above threshold", () => {
    const now = new Date(first.getTime() + 14 * 86400000);
    const locked = recheckAtLockTime({
      orders: nSixPackOrders(43),
      firstOrderAt: first,
      now,
      cfg,
    });
    expect(locked.action).toBe("lock_immediately");
  });
});

describe("one open shared pallet only", () => {
  it("selects the oldest accepting pallet and flags extras", () => {
    const result = selectSingleOpenSharedPallet([
      { id: "b", status: "open", createdAt: "2026-02-01T00:00:00Z" },
      { id: "a", status: "open", createdAt: "2026-01-01T00:00:00Z" },
      { id: "c", status: "shipping_ordered", createdAt: "2026-01-15T00:00:00Z" },
    ]);
    expect(result.openPalletId).toBe("a");
    expect(result.extras).toEqual(["b"]);
    expect(result.ok).toBe(false);
  });

  it("assignment reuses the existing open pallet", () => {
    expect(
      resolveOrderPalletAssignment({
        existingOpenPalletId: "pallet-1",
        createNewIfMissing: true,
      }),
    ).toEqual({ palletId: "pallet-1", shouldCreate: false });
  });
});

describe("sold-out at lock: packing + replace / remove / cancel / charge / timeout", () => {
  const producerA = "prod-a";
  const producerB = "prod-b";
  const wholesalerName = "Le Clos Saint Gabriel";

  /** Two full 6-packs from different producers — removal of either stays valid. */
  const twoProducerSixes = (): SoldOutLineSnapshot[] => [
    withPackingSource({
      lineId: "l1",
      wineId: "w1",
      quantity: 6,
      originalAmountOre: 90_000,
      state: "ok",
      sourceType: "producer",
      producerId: producerA,
    }),
    withPackingSource({
      lineId: "l2",
      wineId: "w2",
      quantity: 6,
      originalAmountOre: 80_000,
      state: "ok",
      sourceType: "producer",
      producerId: producerB,
    }),
  ];

  /** Mixed 3+3 same producer — removing one wine breaks packing. */
  const mixedSameProducer = (): SoldOutLineSnapshot[] => [
    withPackingSource({
      lineId: "l1",
      wineId: "w1",
      quantity: 3,
      originalAmountOre: 45_000,
      state: "ok",
      sourceType: "producer",
      producerId: producerA,
    }),
    withPackingSource({
      lineId: "l2",
      wineId: "w2",
      quantity: 3,
      originalAmountOre: 40_000,
      state: "ok",
      sourceType: "producer",
      producerId: producerA,
    }),
  ];

  /** Wholesaler 4 + producer 6 — removing wholesaler wine leaves producer OK but wholesaler 0. */
  const wholesalerAndProducer = (): SoldOutLineSnapshot[] => [
    withPackingSource({
      lineId: "l1",
      wineId: "w-ws",
      quantity: 6,
      originalAmountOre: 70_000,
      state: "ok",
      sourceType: "wholesaler",
      sourceName: wholesalerName,
      producerId: producerA,
    }),
    withPackingSource({
      lineId: "l2",
      wineId: "w-p",
      quantity: 6,
      originalAmountOre: 80_000,
      state: "ok",
      sourceType: "producer",
      producerId: producerB,
    }),
  ];

  it("packing source ids distinguish producer vs wholesaler", () => {
    expect(
      packingSourceIdForWine({
        sourceType: "producer",
        producerId: producerA,
      }),
    ).toBe(`producer:${producerA}`);
    expect(
      packingSourceIdForWine({
        sourceType: "wholesaler",
        sourceName: wholesalerName,
        producerId: producerA,
      }),
    ).toBe(`wholesaler:${wholesalerName.toLowerCase()}`);
    expect(PACK_BOTTLES_PER_SOURCE).toBe(6);
  });

  it("admin mark unavailable flips matching lines to pending_choice", () => {
    const next = markWineUnavailableOnLines(twoProducerSixes(), "w1");
    expect(next[0]!.state).toBe("pending_choice");
    expect(next[1]!.state).toBe("ok");
  });

  it("when removal keeps multiples of 6: choices are replace or remove", () => {
    const pending = markWineUnavailableOnLines(twoProducerSixes(), "w1");
    expect(canRemoveSoldOutLine(pending, "l1")).toBe(true);
    expect(resolveSoldOutAllowedChoices(pending, "l1").choices).toEqual([
      "replace",
      "remove",
    ]);
  });

  it("when removal breaks packing: choices are replace or cancel_order (not remove)", () => {
    const pending = markWineUnavailableOnLines(mixedSameProducer(), "w1");
    expect(canRemoveSoldOutLine(pending, "l1")).toBe(false);
    expect(resolveSoldOutAllowedChoices(pending, "l1").choices).toEqual([
      "replace",
      "cancel_order",
    ]);
    const rejected = applySoldOutCustomerDecision({
      lines: pending,
      lineId: "l1",
      choice: "remove",
    });
    expect(rejected.ok).toBe(false);
  });

  it("remove: charge = original minus removed line", () => {
    const lines = markWineUnavailableOnLines(twoProducerSixes(), "w1").map(
      (l) =>
        l.lineId === "l1"
          ? applySoldOutChoice({ line: l, choice: "remove" })
          : l,
    );
    const adj = computeChargeAfterSoldOutChoices({
      originalOrderAmountOre: 170_000,
      lines,
    });
    expect(adj.chargeAmountOre).toBe(80_000);
    expect(adj.removedAmountOre).toBe(90_000);
    expect(adj.orderCancelled).toBe(false);
  });

  it("pricier replacement: charge adds only the positive delta", () => {
    const lines = markWineUnavailableOnLines(twoProducerSixes(), "w1").map(
      (l) =>
        l.lineId === "l1"
          ? applySoldOutChoice({
              line: l,
              choice: "replace",
              replacementWineId: "w3",
              replacementAmountOre: 100_000,
            })
          : l,
    );
    const adj = computeChargeAfterSoldOutChoices({
      originalOrderAmountOre: 170_000,
      lines,
    });
    expect(adj.chargeAmountOre).toBe(180_000);
    expect(adj.replacementDeltaOre).toBe(10_000);
  });

  it("cheaper replacement: charges the lower replacement amount", () => {
    const lines = markWineUnavailableOnLines(twoProducerSixes(), "w1").map(
      (l) =>
        l.lineId === "l1"
          ? applySoldOutChoice({
              line: l,
              choice: "replace",
              replacementWineId: "w3",
              replacementAmountOre: 70_000,
            })
          : l,
    );
    const adj = computeChargeAfterSoldOutChoices({
      originalOrderAmountOre: 170_000,
      lines,
    });
    expect(adj.chargeAmountOre).toBe(150_000);
    expect(adj.replacementDeltaOre).toBe(0);
  });

  it("replacement must be from the same packing source", () => {
    const pending = markWineUnavailableOnLines(mixedSameProducer(), "w1");
    const line = pending[0]!;
    expect(
      isReplacementSamePackingSource(line, {
        sourceType: "producer",
        producerId: producerA,
      }),
    ).toBe(true);
    expect(
      isReplacementSamePackingSource(line, {
        sourceType: "producer",
        producerId: producerB,
      }),
    ).toBe(false);
    const bad = applySoldOutCustomerDecision({
      lines: pending,
      lineId: "l1",
      choice: "replace",
      replacementWineId: "w-other",
      replacementAmountOre: 45_000,
      replacementPacking: {
        sourceType: "producer",
        producerId: producerB,
      },
    });
    expect(bad.ok).toBe(false);
  });

  it("cancel_order: charge 0 and all lines removed", () => {
    const pending = markWineUnavailableOnLines(mixedSameProducer(), "w1");
    const decision = applySoldOutCustomerDecision({
      lines: pending,
      lineId: "l1",
      choice: "cancel_order",
    });
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.orderCancelled).toBe(true);
    expect(decision.lines.every((l) => l.state === "removed")).toBe(true);
    const adj = computeChargeAfterSoldOutChoices({
      originalOrderAmountOre: 85_000,
      lines: decision.lines,
      orderCancelled: true,
    });
    expect(adj.chargeAmountOre).toBe(0);
    expect(adj.orderCancelled).toBe(true);
  });

  it("no-answer timeout removes when packing stays valid", () => {
    const pending = markWineUnavailableOnLines(twoProducerSixes(), "w1");
    const timed = applySoldOutChoiceTimeout(pending);
    expect(timed.outcome).toBe("remove");
    expect(timed.orderCancelled).toBe(false);
    expect(timed.lines[0]!.state).toBe("removed");
    expect(timed.lines[1]!.state).toBe("ok");
  });

  it("no-answer timeout cancels whole order when packing would break", () => {
    const pending = markWineUnavailableOnLines(mixedSameProducer(), "w1");
    const timed = applySoldOutChoiceTimeout(pending);
    expect(timed.outcome).toBe("cancel_order");
    expect(timed.orderCancelled).toBe(true);
    expect(timed.lines.every((l) => l.state === "removed")).toBe(true);
    const adj = computeChargeAfterSoldOutChoices({
      originalOrderAmountOre: 85_000,
      lines: timed.lines,
      orderCancelled: true,
    });
    expect(adj.chargeAmountOre).toBe(0);
  });

  it("wholesaler full case can be removed without cancel (producer case remains)", () => {
    const pending = markWineUnavailableOnLines(wholesalerAndProducer(), "w-ws");
    expect(canRemoveSoldOutLine(pending, "l1")).toBe(true);
    const timed = applySoldOutChoiceTimeout(pending);
    expect(timed.outcome).toBe("remove");
    expect(timed.lines[0]!.state).toBe("removed");
    expect(timed.lines[1]!.state).toBe("ok");
  });

  it("mixed wines within wholesaler: remove one of 3+3 → cancel", () => {
    const lines = [
      withPackingSource({
        lineId: "l1",
        wineId: "wa",
        quantity: 3,
        originalAmountOre: 30_000,
        state: "ok",
        sourceType: "wholesaler",
        sourceName: wholesalerName,
      }),
      withPackingSource({
        lineId: "l2",
        wineId: "wb",
        quantity: 3,
        originalAmountOre: 30_000,
        state: "ok",
        sourceType: "wholesaler",
        sourceName: wholesalerName,
      }),
    ];
    const pending = markWineUnavailableOnLines(lines, "wa");
    expect(canRemoveSoldOutLine(pending, "l1")).toBe(false);
    expect(applySoldOutChoiceTimeout(pending).outcome).toBe("cancel_order");
  });

  it("coverage bottle totals drop removed / cancelled lines via packing progress", () => {
    const pending = markWineUnavailableOnLines(twoProducerSixes(), "w1");
    const timed = applySoldOutChoiceTimeout(pending);
    const progress = computePackingSourceProgress(
      timed.lines
        .filter((l) => l.state !== "removed")
        .map((l) => ({
          quantity: l.quantity,
          sourceType: l.sourceType,
          sourceName: l.sourceName,
          producerId: l.producerId,
        })),
    );
    expect(progress).toHaveLength(1);
    expect(progress[0]!.quantity).toBe(6);
    expect(progress[0]!.isValid).toBe(true);
  });
});

describe("progress display X av Y (current threshold)", () => {
  const cfg = getPalletCoverageCloseConfig({});
  const first = new Date("2026-01-01T00:00:00.000Z");

  it("cap-only phase: Y = bottle cap (600)", () => {
    const p = bottlesNeededForCurrentThreshold({
      orders: nSixPackOrders(5),
      firstOrderAt: first,
      now: new Date(first.getTime() + 2 * 86400000),
      cfg,
    });
    expect(p.threshold.phase).toBe("cap_only");
    expect(p.targetBottles).toBe(600);
    expect(p.filledBottles).toBe(30);
  });

  it("recomputes Y when threshold drops from 125% to 100%", () => {
    const orders = nSixPackOrders(20);
    const atDay7 = bottlesNeededForCurrentThreshold({
      orders,
      firstOrderAt: first,
      now: new Date(first.getTime() + 7 * 86400000),
      cfg,
    });
    const at100 = bottlesNeededForCurrentThreshold({
      orders,
      firstOrderAt: first,
      now: new Date(first.getTime() + 14 * 86400000),
      cfg,
    });
    expect(atDay7.threshold.requiredCoverage).toBe(1.25);
    expect(at100.threshold.requiredCoverage).toBe(1.0);
    expect(at100.targetBottles).toBeLessThan(atDay7.targetBottles);
  });
});

describe("checkout / terms placeholders", () => {
  it("progress and checkout copy are TODO(Juliette/Margaux)", () => {
    expect(coverageProgressLabel({ locale: "sv", filled: 12, target: 258 })).toContain(
      "TODO(Juliette/Margaux)",
    );
    expect(coverageProgressLabel({ locale: "sv", filled: 12, target: 258 })).toContain(
      "12 av 258 flaskor",
    );
    expect(coverageCheckoutHint("en")).toContain("TODO(Juliette/Margaux)");
    expect(coverageTermsPlaceholder("sv")).toContain("TODO(Juliette/Margaux)");
  });
});

describe("sold-out choice deadline (configurable)", () => {
  it("deadline uses config days; past deadline detected", () => {
    const cfg = getPalletCoverageCloseConfig({
      PALLET_COVERAGE_SOLD_OUT_CHOICE_DAYS: "3",
    } as NodeJS.ProcessEnv);
    const from = new Date("2026-03-01T00:00:00.000Z");
    const deadline = soldOutChoiceDeadlineAt(from, cfg);
    expect(deadline.toISOString()).toBe("2026-03-04T00:00:00.000Z");
    expect(isSoldOutChoicePastDeadline(deadline, new Date("2026-03-03T23:00:00Z"))).toBe(
      false,
    );
    expect(isSoldOutChoicePastDeadline(deadline, new Date("2026-03-04T00:00:01Z"))).toBe(
      true,
    );
  });
});

describe("placeholder emails", () => {
  it("heads-up and sold-out emails are marked TODO(Juliette/Margaux)", () => {
    const heads = buildPalletLockHeadsUpEmail({
      locale: "sv",
      customerName: "Ada",
      amountLabel: "1200 kr",
      lockDateLabel: "2026-02-02",
      cancelUrl: "https://example.com/cancel",
      reservationId: "r1",
    });
    expect(heads.subject).toContain("TODO(Juliette/Margaux)");
    expect(heads.text).toContain("Avboka");

    const sold = buildSoldOutChoiceEmail({
      locale: "en",
      customerName: "Ada",
      wineTitle: "Test Wine",
      choiceUrl: "https://example.com/choice",
      replyByLabel: "2026-02-10",
      reservationId: "r1",
    });
    expect(sold.subject).toContain("TODO(Juliette/Margaux)");
  });
});
