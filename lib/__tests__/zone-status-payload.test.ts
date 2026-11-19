import { describe, expect, it } from "vitest";
import { parseZoneStatusPayload } from "@/lib/pallet/zone-status";

describe("parseZoneStatusPayload", () => {
  it("parses filled/capacity fields used by SSR snapshots", () => {
    const parsed = parseZoneStatusPayload({
      bottlesFilled: 36,
      bottleCapacity: 120,
      fillPercent: 30,
      discountTier: 0,
      estimatedDays: null,
      userZoneName: "Stockholm",
      settingsUrl: "/settings/zone",
      statusPrimary: "Pallet status",
      bottlesVerb: "ordered",
      logisticsFootnote: null,
      dropState: "existing",
      marketDropId: null,
      displayDestination: "Stockholm",
      canStartMarketDrop: true,
      campaignTagline: null,
      showProgressBar: true,
      showEarlyBird: false,
      unavailableMessage: null,
      physicalBottleCapacity: 720,
      minBottlesToShip: 120,
      bottlesRemainingToShip: 84,
      shipProgressPercent: 30,
      isReadyToShip: false,
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.bottlesFilled).toBe(36);
    expect(parsed?.minBottlesToShip).toBe(120);
    expect(parsed?.bottlesRemainingToShip).toBe(84);
    expect(parsed?.shipProgressPercent).toBe(30);
    expect(parsed?.palletResolved).toBe(false);
    expect(parsed?.deliveryExpectedDate).toBeNull();
  });

  it("keeps delivery dates only when they are real calendar days", () => {
    const parsed = parseZoneStatusPayload({
      bottlesFilled: 0,
      bottleCapacity: 270,
      fillPercent: 0,
      discountTier: 0,
      estimatedDays: null,
      userZoneName: "Stockholm",
      settingsUrl: "/settings/zone",
      palletResolved: true,
      deliveryExpectedDate: "2026-12-04",
      deliveryWindowStart: "not-a-date",
      deliveryWindowEnd: "2026-12-18",
    });
    expect(parsed?.palletResolved).toBe(true);
    expect(parsed?.deliveryExpectedDate).toBe("2026-12-04");
    expect(parsed?.deliveryWindowStart).toBeNull();
    expect(parsed?.deliveryWindowEnd).toBe("2026-12-18");
  });

  it("returns null for invalid payloads", () => {
    expect(parseZoneStatusPayload(null)).toBeNull();
    expect(parseZoneStatusPayload({ bottlesFilled: "x" })).toBeNull();
  });
});
