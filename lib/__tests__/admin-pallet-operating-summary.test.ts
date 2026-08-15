import { describe, expect, it } from "vitest";
import {
  buildWarnings,
  resolveFreightTargetSource,
} from "../admin-pallet-operating-summary";
import { computePalletShipProgress } from "../pallet-ship-progress";
import { computePalletContributionProgress } from "../pallet-contribution";

describe("AdminPalletOperatingSummary helpers (Phase 2D)", () => {
  it("freight target precedence: manual > selected quote > legacy cost", () => {
    expect(
      resolveFreightTargetSource({
        freight_target_cents: 500000,
        selectedQuoteSekCents: 426100,
        cost_cents: 600000,
      }),
    ).toBe("manual_override");

    expect(
      resolveFreightTargetSource({
        freight_target_cents: null,
        selectedQuoteSekCents: 426100,
        cost_cents: 600000,
      }),
    ).toBe("selected_quote");

    expect(
      resolveFreightTargetSource({
        freight_target_cents: null,
        selectedQuoteSekCents: null,
        cost_cents: 600000,
      }),
    ).toBe("legacy_cost");

    expect(
      resolveFreightTargetSource({
        freight_target_cents: 0,
        selectedQuoteSekCents: 0,
        cost_cents: 0,
      }),
    ).toBe("none");
  });

  it("30 bottles: ship readiness 25%, physical ~4.17%, not ready", () => {
    const p = computePalletShipProgress(30, 120, 720);
    expect(p.bottlesFilled).toBe(30);
    expect(p.minBottlesToShip).toBe(120);
    expect(p.bottlesRemainingToShip).toBe(90);
    expect(p.shipProgressPercent).toBe(25);
    expect(p.isReadyToShip).toBe(false);
    expect(p.physicalBottleCapacity).toBe(720);

    const physicalRemaining = Math.max(0, p.physicalBottleCapacity - p.bottlesFilled);
    const physicalUtilizationPercent =
      Math.round(
        Math.min(100, (p.bottlesFilled / p.physicalBottleCapacity) * 100) * 10,
      ) / 10;
    expect(physicalRemaining).toBe(690);
    expect(physicalUtilizationPercent).toBeCloseTo(4.2, 1); // 4.166… → 4.2 one decimal
  });

  it("119 bottles + economically funded → live NOT ready, shadow may be ready", () => {
    const ship = computePalletShipProgress(119, 120, 720);
    expect(ship.isReadyToShip).toBe(false);

    const econ = computePalletContributionProgress({
      accumulatedContributionCents: 500000,
      freightTargetCents: 400000,
      bottlesWithSnapshot: 119,
      bottlesFilled: 119,
      minBottlesToShip: 120,
    });
    expect(econ.isEconomicallyReady).toBe(true);
  });

  it("120 bottles + economically underfunded → live READY, shadow underfunded", () => {
    const ship = computePalletShipProgress(120, 120, 720);
    expect(ship.isReadyToShip).toBe(true);

    const econ = computePalletContributionProgress({
      accumulatedContributionCents: 100000,
      freightTargetCents: 400000,
      bottlesWithSnapshot: 120,
      bottlesFilled: 120,
      minBottlesToShip: 120,
    });
    expect(econ.isEconomicallyReady).toBe(false);
  });

  it("buildWarnings flags incomplete outbound packaging and legacy freight", () => {
    const warnings = buildWarnings({
      economics: {
        bottlesWithSnapshot: 30,
        accumulatedContributionCents: 10000,
        freightTargetCents: 600000,
        freightTargetSource: "legacy_cost",
        freightFundedPercent: 2,
        remainingContributionCents: 590000,
        isEconomicallyReady: false,
        hasIncompleteSnapshots: true,
        estimatedBottlesRemaining: null,
      },
      inbound: {
        providerName: null,
        serviceName: null,
        quoteId: null,
        currency: null,
        totalOriginalMinor: null,
        totalSekCents: null,
        economicallyUsable: false,
      },
      outbound: {
        providerName: "Instabee",
        serviceName: "Budbee Light",
        packagingCode: "WINE_BOX_6",
        packagingConfigured: false,
        incompleteQuoteCount: 0,
        usableQuoteCount: 0,
      },
    });

    expect(warnings.some((w) => w.includes("legacy"))).toBe(true);
    expect(warnings.some((w) => w.toLowerCase().includes("outbound"))).toBe(
      true,
    );
    expect(warnings.some((w) => /0\s*sek/i.test(w))).toBe(false);
  });
});
