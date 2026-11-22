/**
 * Prod mirrors SE delivery radii (not only Stockholm). TEST DB currently has
 * only Synthetic Stockholm Delivery — these fixtures mirror prod so we can
 * assert Göteborg / Malmö / Uppsala match without seeding TEST zones.
 */
import { describe, expect, it } from "vitest";
import {
  buildDeliveryGeocodeAddress,
  findMatchingDeliveryZones,
  isLikelyStockholmAreaPostal,
  type DeliveryZoneGeoRow,
} from "@/lib/zone-matching";
import { resolveCheckoutZoneMatchForAvailability } from "@/lib/commerce/fulfillment-postal-availability";

/** Approximate city centers + prod-reported radii (Camille 22/11). */
const PROD_MIRROR_DELIVERY_ZONES: DeliveryZoneGeoRow[] = [
  {
    id: "z-sthlm-40",
    name: "Stockholm 40",
    center_lat: 59.3293,
    center_lon: 18.0686,
    radius_km: 40,
  },
  {
    id: "z-gbg-50",
    name: "Göteborg 50",
    center_lat: 57.7089,
    center_lon: 11.9746,
    radius_km: 50,
  },
  {
    id: "z-gbg-150",
    name: "Göteborg 150",
    center_lat: 57.7089,
    center_lon: 11.9746,
    radius_km: 150,
  },
  {
    id: "z-malmo-150",
    name: "Malmö 150",
    center_lat: 55.605,
    center_lon: 13.0038,
    radius_km: 150,
  },
  {
    id: "z-helsingborg-100",
    name: "Helsingborg 100",
    center_lat: 56.0465,
    center_lon: 12.6945,
    radius_km: 100,
  },
  {
    id: "z-linkoping-100",
    name: "Linköping 100",
    center_lat: 58.4108,
    center_lon: 15.6214,
    radius_km: 100,
  },
  {
    id: "z-orebro-100",
    name: "Örebro 100",
    center_lat: 59.2753,
    center_lon: 15.2134,
    radius_km: 100,
  },
  {
    id: "z-uppsala-100",
    name: "Uppsala 100",
    center_lat: 59.8586,
    center_lon: 17.6389,
    radius_km: 100,
  },
  {
    id: "z-vasteras-40",
    name: "Västerås 40",
    center_lat: 59.6099,
    center_lon: 16.5448,
    radius_km: 40,
  },
];

/** Typical Mapbox centroids for guest postal-only queries. */
const POSTAL_COORDS = {
  stockholm11151: { lat: 59.3293, lon: 18.0686 },
  goteborg41101: { lat: 57.7089, lon: 11.9746 },
  malmo21115: { lat: 55.605, lon: 13.0038 },
  uppsala75310: { lat: 59.8586, lon: 17.6389 },
  kiruna98131: { lat: 67.8558, lon: 20.2253 },
} as const;

describe("findMatchingDeliveryZones (prod-mirroring SE radii)", () => {
  it("Göteborg 41101 matches Göteborg 50 (prefers smaller radius over 150)", () => {
    const matches = findMatchingDeliveryZones(
      POSTAL_COORDS.goteborg41101.lat,
      POSTAL_COORDS.goteborg41101.lon,
      PROD_MIRROR_DELIVERY_ZONES,
    );
    expect(matches.map((m) => m.id)).toEqual(["z-gbg-50", "z-gbg-150"]);
    expect(matches[0]?.name).toMatch(/Göteborg 50/i);
  });

  it("Malmö 21115 matches Malmö 150", () => {
    const matches = findMatchingDeliveryZones(
      POSTAL_COORDS.malmo21115.lat,
      POSTAL_COORDS.malmo21115.lon,
      PROD_MIRROR_DELIVERY_ZONES,
    );
    expect(matches.some((m) => m.id === "z-malmo-150")).toBe(true);
  });

  it("Uppsala 75310 matches Uppsala 100", () => {
    const matches = findMatchingDeliveryZones(
      POSTAL_COORDS.uppsala75310.lat,
      POSTAL_COORDS.uppsala75310.lon,
      PROD_MIRROR_DELIVERY_ZONES,
    );
    expect(matches.some((m) => m.id === "z-uppsala-100")).toBe(true);
  });

  it("Stockholm 11151 matches Stockholm 40", () => {
    const matches = findMatchingDeliveryZones(
      POSTAL_COORDS.stockholm11151.lat,
      POSTAL_COORDS.stockholm11151.lon,
      PROD_MIRROR_DELIVERY_ZONES,
    );
    expect(matches[0]?.id).toBe("z-sthlm-40");
  });

  it("Kiruna 98131 matches no SE delivery zone", () => {
    const matches = findMatchingDeliveryZones(
      POSTAL_COORDS.kiruna98131.lat,
      POSTAL_COORDS.kiruna98131.lon,
      PROD_MIRROR_DELIVERY_ZONES,
    );
    expect(matches).toEqual([]);
  });
});

describe("buildDeliveryGeocodeAddress (postal-only / city=postal seed)", () => {
  it("geocodes postcode+country when city is missing", () => {
    const q = buildDeliveryGeocodeAddress({
      postcode: "41101",
      city: "",
      countryCode: "SE",
    });
    expect(q).toMatch(/41101/);
    expect(q).toMatch(/Sweden/i);
    expect(q).not.toMatch(/41101 41101/);
  });

  it("does not duplicate when UI seeds city=postcode", () => {
    const q = buildDeliveryGeocodeAddress({
      postcode: "21115",
      city: "21115",
      countryCode: "SE",
    });
    expect(q).toMatch(/21115/);
    expect(q.split("21115").length - 1).toBeLessThanOrEqual(2);
  });

  it("includes a real city when present", () => {
    const q = buildDeliveryGeocodeAddress({
      postcode: "75310",
      city: "Uppsala",
      countryCode: "SE",
    });
    expect(q).toMatch(/75310/);
    expect(q).toMatch(/Uppsala/);
  });
});

describe("Stockholm postal heuristic is loading-only (never final for GBG)", () => {
  it("treats 41101 / 21115 / 75310 as non-Stockholm for the flash guard", () => {
    expect(isLikelyStockholmAreaPostal("41101")).toBe(false);
    expect(isLikelyStockholmAreaPostal("21115")).toBe(false);
    expect(isLikelyStockholmAreaPostal("75310")).toBe(false);
  });

  it("Göteborg stays fail-closed only while loading; in_zone once delivery ready", () => {
    expect(
      resolveCheckoutZoneMatchForAvailability({
        zoneError: null,
        deliveryZoneReady: false,
        zoneFetchCompleted: false,
        postal: "41101",
      }),
    ).toBe("out_of_zone");
    expect(
      resolveCheckoutZoneMatchForAvailability({
        zoneError: null,
        deliveryZoneReady: true,
        zoneFetchCompleted: true,
        postal: "41101",
      }),
    ).toBe("in_zone");
  });

  it("Malmö / Uppsala in_zone when delivery zone matched (heuristic not final)", () => {
    for (const postal of ["21115", "75310"]) {
      expect(
        resolveCheckoutZoneMatchForAvailability({
          zoneError: null,
          deliveryZoneReady: true,
          zoneFetchCompleted: true,
          postal,
        }),
      ).toBe("in_zone");
    }
  });

  it("Kiruna 98131 stays out_of_zone after completed fetch without zone", () => {
    expect(
      resolveCheckoutZoneMatchForAvailability({
        zoneError: null,
        deliveryZoneReady: false,
        zoneFetchCompleted: true,
        postal: "98131",
      }),
    ).toBe("out_of_zone");
  });
});
