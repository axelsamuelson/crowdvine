import { describe, expect, it } from "vitest";

import { alignedCartCookie } from "@/lib/cart/align-cart-cookie";
import { resolveMinBottlesToShip } from "@/lib/pallet-ship-progress";
import { isCancelledEmptyReservation } from "@/lib/reservations/user-reservations-api";
import { resolveAppLocale } from "@/lib/shopping-context/resolve";
import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";

const sweden = {
  geoZoneId: null,
  marketCode: "EU",
  countryCode: "SE",
  regionCode: null,
  city: "Stockholm",
  displayName: "Stockholm",
  zoneType: "city",
  eligibilityStatus: "normal_checkout",
  currencyCode: "SEK",
  defaultDeliveryZoneId: null,
  source: "default",
  canStartCampaign: true,
  canReserveConditionally: false,
  canCheckoutNormally: true,
} as ResolvedActiveGeoZone;

describe("Swedish shoppers stay on Swedish", () => {
  it("uses Swedish on checkout for a signed-in SE user even when the cookie and market locale are English", () => {
    expect(
      resolveAppLocale({
        uiLocalizationEnabled: true,
        marketLocale: "en",
        cookieLocale: "en",
        acceptLanguage: "en-US,en;q=0.9",
        userPreferred: null,
        activeZone: sweden,
        pathLocale: null,
        hasUser: true,
      }),
    ).toBe("sv");
  });

  it("keeps an explicit English preference and an English URL", () => {
    expect(
      resolveAppLocale({
        uiLocalizationEnabled: true,
        marketLocale: "en",
        cookieLocale: "sv",
        acceptLanguage: "sv-SE",
        userPreferred: "en",
        activeZone: sweden,
        pathLocale: null,
        hasUser: true,
      }),
    ).toBe("en");
    expect(
      resolveAppLocale({
        uiLocalizationEnabled: true,
        marketLocale: "sv",
        cookieLocale: "sv",
        acceptLanguage: "sv-SE",
        userPreferred: "sv",
        activeZone: sweden,
        pathLocale: "en",
        hasUser: true,
      }),
    ).toBe("en");
  });
});

describe("Mina köp pallet goal and empty cancels", () => {
  it("targets min_bottles_to_complete, not bottle_capacity", () => {
    expect(resolveMinBottlesToShip(270)).toBe(270);
    expect(resolveMinBottlesToShip(undefined)).toBe(270);
    expect(resolveMinBottlesToShip(undefined)).not.toBe(720);
  });

  it("hides cancelled reservations with zero items", () => {
    expect(
      isCancelledEmptyReservation({
        status: "cancelled",
        items: [],
        bottleCount: 0,
      }),
    ).toBe(true);
    expect(
      isCancelledEmptyReservation({
        status: "cancelled",
        items: [{ quantity: 6 }],
      }),
    ).toBe(false);
    expect(
      isCancelledEmptyReservation({
        status: "placed",
        items: [],
      }),
    ).toBe(false);
  });
});

describe("cart cookie", () => {
  it("rewrites the cookie to the database cart id", () => {
    expect(alignedCartCookie("dd01d636-session", "6a989498-user-cart")).toBe(
      "6a989498-user-cart",
    );
    expect(alignedCartCookie("6a989498-user-cart", "6a989498-user-cart")).toBe(
      "6a989498-user-cart",
    );
  });
});
