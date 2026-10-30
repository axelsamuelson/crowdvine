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
  });

  it("returns null for invalid payloads", () => {
    expect(parseZoneStatusPayload(null)).toBeNull();
    expect(parseZoneStatusPayload({ bottlesFilled: "x" })).toBeNull();
  });
});
