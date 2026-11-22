import { describe, expect, it } from "vitest";
import {
  mayOpenComplianceWithoutPallet,
  requiresDeliveryZoneIdForChannel,
  requiresPickupOrPalletForChannel,
  resolveCheckoutZoneMatchForAvailability,
  resolveFulfillmentPostalAvailability,
  shouldHardBlockNoDeliveryZone,
  shouldShowNoPickupForCart,
} from "@/lib/commerce/fulfillment-postal-availability";
import { isLikelyStockholmAreaPostal } from "@/lib/zone-matching";

/** Representative postals from the product brief. */
const KIRUNA = "98131";
const STOCKHOLM = "11151";

describe("fulfillment postal availability (Kiruna / Stockholm)", () => {
  it(`Kiruna ${KIRUNA}: only direct when DIRECT on + selectable`, () => {
    const result = resolveFulfillmentPostalAvailability({
      zoneMatch: "out_of_zone",
      budbeeAvailable: false,
      directBoxCheckoutEnabled: true,
      directBoxDeliverySelectable: true,
      countryCode: "SE",
    });
    expect(result.sharedPalletAvailable).toBe(false);
    expect(result.sharedUnavailableReason).toBe("out_of_zone");
    expect(result.directBoxAvailable).toBe(true);
    expect(result.availableChannels).toEqual(["direct_box"]);
    expect(result.preferredChannel).toBe("direct_box");
    expect(result.noFulfillmentAvailable).toBe(false);
    expect(result.shouldLogPostalOutOfZone).toBe(false);
  });

  it(`Stockholm ${STOCKHOLM}: both channels when DIRECT on`, () => {
    const result = resolveFulfillmentPostalAvailability({
      zoneMatch: "in_zone",
      budbeeAvailable: true,
      directBoxCheckoutEnabled: true,
      directBoxDeliverySelectable: true,
      countryCode: "SE",
    });
    expect(result.sharedPalletAvailable).toBe(true);
    expect(result.directBoxAvailable).toBe(true);
    expect(result.availableChannels).toEqual(["shared_pallet", "direct_box"]);
    expect(result.preferredChannel).toBe("shared_pallet");
    expect(result.shouldLogPostalOutOfZone).toBe(false);
  });

  it(`Kiruna ${KIRUNA}: blocked as today when DIRECT off`, () => {
    const result = resolveFulfillmentPostalAvailability({
      zoneMatch: "out_of_zone",
      budbeeAvailable: false,
      directBoxCheckoutEnabled: false,
      directBoxDeliverySelectable: false,
      countryCode: "SE",
    });
    expect(result.sharedPalletAvailable).toBe(false);
    expect(result.directBoxAvailable).toBe(false);
    expect(result.availableChannels).toEqual([]);
    expect(result.noFulfillmentAvailable).toBe(true);
    expect(result.shouldLogPostalOutOfZone).toBe(true);
    expect(result.preferredChannel).toBeNull();
  });

  it("Kiruna with DIRECT on but carrier not selectable → still blocked", () => {
    const result = resolveFulfillmentPostalAvailability({
      zoneMatch: "out_of_zone",
      budbeeAvailable: null,
      directBoxCheckoutEnabled: true,
      directBoxDeliverySelectable: false,
      countryCode: "SE",
    });
    expect(result.directBoxAvailable).toBe(false);
    expect(result.noFulfillmentAvailable).toBe(true);
    expect(result.shouldLogPostalOutOfZone).toBe(true);
  });

  it("in-zone but Budbee false → shared unavailable, prefer direct when on", () => {
    const result = resolveFulfillmentPostalAvailability({
      zoneMatch: "in_zone",
      budbeeAvailable: false,
      directBoxCheckoutEnabled: true,
      directBoxDeliverySelectable: true,
      countryCode: "SE",
    });
    expect(result.sharedPalletAvailable).toBe(false);
    expect(result.sharedUnavailableReason).toBe("budbee_unavailable");
    expect(result.preferredChannel).toBe("direct_box");
    expect(result.shouldLogPostalOutOfZone).toBe(false);
  });
});

describe("Stockholm-area postal heuristic (geocode-down fallback)", () => {
  it("treats 11151 as Stockholm-area and 98131 as not", () => {
    expect(isLikelyStockholmAreaPostal(STOCKHOLM)).toBe(true);
    expect(isLikelyStockholmAreaPostal(KIRUNA)).toBe(false);
    expect(isLikelyStockholmAreaPostal("11 151")).toBe(true);
  });
});

describe("resolveCheckoutZoneMatchForAvailability (guest reload Kiruna)", () => {
  it("fail-closes 98131 while zones are still loading (no Delad pall flash)", () => {
    expect(
      resolveCheckoutZoneMatchForAvailability({
        zoneError: null,
        deliveryZoneReady: false,
        zoneFetchCompleted: false,
        postal: KIRUNA,
      }),
    ).toBe("out_of_zone");
  });

  it("fail-closes 98131 after fetch completes without a delivery zone", () => {
    expect(
      resolveCheckoutZoneMatchForAvailability({
        zoneError: null,
        deliveryZoneReady: false,
        zoneFetchCompleted: true,
        postal: KIRUNA,
      }),
    ).toBe("out_of_zone");
  });

  it("keeps explicit NO_DELIVERY_ZONE as out_of_zone", () => {
    expect(
      resolveCheckoutZoneMatchForAvailability({
        zoneError: "NO_DELIVERY_ZONE",
        deliveryZoneReady: false,
        zoneFetchCompleted: true,
        postal: KIRUNA,
      }),
    ).toBe("out_of_zone");
  });

  it("allows Stockholm 11151 unknown while loading (both channels may appear)", () => {
    expect(
      resolveCheckoutZoneMatchForAvailability({
        zoneError: null,
        deliveryZoneReady: false,
        zoneFetchCompleted: false,
        postal: STOCKHOLM,
      }),
    ).toBe("unknown");
  });

  it("marks Stockholm in_zone when delivery zone is ready", () => {
    expect(
      resolveCheckoutZoneMatchForAvailability({
        zoneError: null,
        deliveryZoneReady: true,
        zoneFetchCompleted: true,
        postal: STOCKHOLM,
      }),
    ).toBe("in_zone");
  });
});

describe("shouldHardBlockNoDeliveryZone + requiresDeliveryZoneId", () => {
  it("does not hard-block direct_box when DIRECT is available", () => {
    expect(
      shouldHardBlockNoDeliveryZone({
        zoneError: "NO_DELIVERY_ZONE",
        fulfillmentChannel: "direct_box",
        directBoxCheckoutEnabled: true,
        directBoxDeliverySelectable: true,
        countryCode: "SE",
      }),
    ).toBe(false);
  });

  it("hard-blocks shared_pallet on NO_DELIVERY_ZONE even if DIRECT available", () => {
    expect(
      shouldHardBlockNoDeliveryZone({
        zoneError: "NO_DELIVERY_ZONE",
        fulfillmentChannel: "shared_pallet",
        directBoxCheckoutEnabled: true,
        directBoxDeliverySelectable: true,
        countryCode: "SE",
      }),
    ).toBe(true);
  });

  it("hard-blocks when DIRECT is off (legacy Kiruna behaviour)", () => {
    expect(
      shouldHardBlockNoDeliveryZone({
        zoneError: "NO_DELIVERY_ZONE",
        fulfillmentChannel: "shared_pallet",
        directBoxCheckoutEnabled: false,
        directBoxDeliverySelectable: false,
        countryCode: "SE",
      }),
    ).toBe(true);
  });

  it("requires delivery zone only for shared_pallet", () => {
    expect(requiresDeliveryZoneIdForChannel("shared_pallet")).toBe(true);
    expect(requiresDeliveryZoneIdForChannel("direct_box")).toBe(false);
  });
});

describe("no_pickup_for_cart / pallet region (Kiruna direct)", () => {
  it("never shows no_pickup_for_cart for direct_box (Kiruna, no pallet region)", () => {
    expect(requiresPickupOrPalletForChannel("direct_box")).toBe(false);
    expect(mayOpenComplianceWithoutPallet("direct_box")).toBe(true);
    expect(
      shouldShowNoPickupForCart({
        fulfillmentChannel: "direct_box",
        hasProducerItems: true,
        hasSelectedPallet: false,
        palletCount: 0,
        hasZoneWithoutPallet: true,
        zoneError: "NO_DELIVERY_ZONE",
      }),
    ).toBe(false);
    expect(
      shouldShowNoPickupForCart({
        fulfillmentChannel: "direct_box",
        hasProducerItems: true,
        hasSelectedPallet: false,
        palletCount: 0,
        hasZoneWithoutPallet: true,
        zoneError: null,
      }),
    ).toBe(false);
  });

  it("still shows no_pickup_for_cart for shared_pallet without pallet", () => {
    expect(requiresPickupOrPalletForChannel("shared_pallet")).toBe(true);
    expect(mayOpenComplianceWithoutPallet("shared_pallet")).toBe(false);
    expect(
      shouldShowNoPickupForCart({
        fulfillmentChannel: "shared_pallet",
        hasProducerItems: true,
        hasSelectedPallet: false,
        palletCount: 0,
        hasZoneWithoutPallet: true,
        zoneError: null,
      }),
    ).toBe(true);
  });
});
