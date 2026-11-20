import { describe, expect, it } from "vitest";
import {
  requiresDeliveryZoneIdForChannel,
  resolveFulfillmentPostalAvailability,
  shouldHardBlockNoDeliveryZone,
} from "@/lib/commerce/fulfillment-postal-availability";

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
