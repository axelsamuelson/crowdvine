import { describe, expect, it } from "vitest";
import {
  isLikelyStockholmAreaPostal,
  mayBypassGeocodeWithPreferredDeliveryZone,
  mayFallbackToPreferredWhenNoGeoMatch,
} from "@/lib/zone-matching";
import {
  mergeProfileContactIntoDelivery,
  resolveCheckoutShoppingLocationLabel,
  resolveFulfillmentChannelAfterReload,
} from "@/lib/checkout/resolve-checkout-zone-from-postal";
import type { ZoneDeliveryLines } from "@/lib/checkout/user-zone-delivery-template";

const STOCKHOLM_PREFERRED = "dz-stockholm-preferred";

describe("mayBypassGeocodeWithPreferredDeliveryZone (reload root cause)", () => {
  it("checkout (no preferLinked flag) never bypasses geocode — even with Stockholm preferred", () => {
    expect(
      mayBypassGeocodeWithPreferredDeliveryZone({
        preferredDeliveryZoneId: STOCKHOLM_PREFERRED,
        postcode: "98131",
      }),
    ).toBe(false);
    expect(
      mayBypassGeocodeWithPreferredDeliveryZone({
        preferredDeliveryZoneId: STOCKHOLM_PREFERRED,
        postcode: "11151",
      }),
    ).toBe(false);
  });

  it("early-bird may bypass for Stockholm-area postals when opted in", () => {
    expect(
      mayBypassGeocodeWithPreferredDeliveryZone({
        preferLinkedDeliveryZone: true,
        preferredDeliveryZoneId: STOCKHOLM_PREFERRED,
        postcode: "11151",
      }),
    ).toBe(true);
  });

  it("early-bird must not invent Stockholm coverage for Kiruna 98131", () => {
    expect(
      mayBypassGeocodeWithPreferredDeliveryZone({
        preferLinkedDeliveryZone: true,
        preferredDeliveryZoneId: STOCKHOLM_PREFERRED,
        postcode: "98131",
      }),
    ).toBe(false);
  });
});

describe("mayFallbackToPreferredWhenNoGeoMatch", () => {
  it("checkout must return NO_DELIVERY_ZONE — no Stockholm preferred fallback", () => {
    expect(mayFallbackToPreferredWhenNoGeoMatch(undefined)).toBe(false);
    expect(mayFallbackToPreferredWhenNoGeoMatch(false)).toBe(false);
  });

  it("early-bird may fall back to linked wine-zone delivery", () => {
    expect(mayFallbackToPreferredWhenNoGeoMatch(true)).toBe(true);
  });
});

describe("geocode-fail preferred fallback postal gate (guest reload)", () => {
  it("Stockholm preferred must not apply to Kiruna 98131 on Mapbox failure", () => {
    // resolveSeDeliveryZoneFallback now returns null unless postal is
    // Stockholm-area — preferredDeliveryZoneId alone must not invent coverage.
    expect(isLikelyStockholmAreaPostal("98131")).toBe(false);
    expect(isLikelyStockholmAreaPostal("11151")).toBe(true);
  });
});

describe("resolveCheckoutShoppingLocationLabel (acceptance C)", () => {
  it("shows Kiruna from saved delivery instead of Stockholm shopping geo", () => {
    const label = resolveCheckoutShoppingLocationLabel({
      deliveryCity: "Kiruna",
      deliveryCountryCode: "SE",
      postal: "98131",
      activeDisplayName: "Stockholm, Sverige",
      activeCountryCode: "SE",
      locale: "sv",
    });
    expect(label).toMatch(/Kiruna/i);
    expect(label).not.toMatch(/Stockholm/i);
  });

  it("shows Stockholm for 11151 with Stockholm delivery city", () => {
    const label = resolveCheckoutShoppingLocationLabel({
      deliveryCity: "Stockholm",
      deliveryCountryCode: "SE",
      postal: "11151",
      activeDisplayName: "Stockholm, Sverige",
      activeCountryCode: "SE",
      locale: "sv",
    });
    expect(label).toMatch(/Stockholm/i);
  });

  it("hides contaminated Stockholm city when postal is 98131", () => {
    const label = resolveCheckoutShoppingLocationLabel({
      deliveryCity: "Stockholm",
      deliveryCountryCode: "SE",
      postal: "98131",
      activeDisplayName: "Stockholm, Sverige",
      activeCountryCode: "SE",
      locale: "sv",
    });
    expect(label).toBeNull();
  });
});

describe("mergeProfileContactIntoDelivery (acceptance D)", () => {
  const zoneLines: ZoneDeliveryLines = {
    street: "Drottninggatan 1",
    city: "Stockholm",
    postal: "11151",
    countryCode: "SE",
    regionCode: null,
    fullName: null,
    phone: null,
    email: "old-guest@example.com",
  };

  it("replaces stale zone email with auth profile email and fills name/phone", () => {
    const merged = mergeProfileContactIntoDelivery(zoneLines, {
      fullName: "Aktuell Kund",
      email: "aktuell@example.com",
      phone: "0701112233",
    });
    expect(merged?.email).toBe("aktuell@example.com");
    expect(merged?.fullName).toBe("Aktuell Kund");
    expect(merged?.phone).toBe("0701112233");
  });

  it("keeps zone contact when profile contact is empty", () => {
    const merged = mergeProfileContactIntoDelivery(zoneLines, {
      fullName: "",
      email: "",
      phone: "",
    });
    expect(merged?.email).toBe("old-guest@example.com");
  });
});

describe("resolveFulfillmentChannelAfterReload (acceptance B)", () => {
  it("keeps stored direct_box when still available", () => {
    expect(
      resolveFulfillmentChannelAfterReload({
        stored: "direct_box",
        sharedPalletAvailable: true,
        directBoxAvailable: true,
        fallback: "shared_pallet",
      }),
    ).toBe("direct_box");
  });

  it("falls back to direct when shared unavailable for 98131", () => {
    expect(
      resolveFulfillmentChannelAfterReload({
        stored: "shared_pallet",
        sharedPalletAvailable: false,
        directBoxAvailable: true,
        fallback: "shared_pallet",
      }),
    ).toBe("direct_box");
  });

  it("keeps stored shared when available for 11151", () => {
    expect(
      resolveFulfillmentChannelAfterReload({
        stored: "shared_pallet",
        sharedPalletAvailable: true,
        directBoxAvailable: true,
        fallback: "direct_box",
      }),
    ).toBe("shared_pallet");
  });
});
