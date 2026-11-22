import { describe, expect, it } from "vitest";
import {
  approxGeocodeSePostal,
  extractSePostalDigits,
} from "@/lib/se-postal-approx-geocode";
import { findMatchingDeliveryZones } from "@/lib/zone-matching";
import type { DeliveryZoneGeoRow } from "@/lib/zone-matching";

const PROD_MIRROR: DeliveryZoneGeoRow[] = [
  {
    id: "z-sthlm",
    name: "Stockholm",
    center_lat: 59.3293,
    center_lon: 18.0686,
    radius_km: 40,
  },
  {
    id: "z-gbg",
    name: "Göteborg",
    center_lat: 57.7072,
    center_lon: 11.967,
    radius_km: 50,
  },
  {
    id: "z-malmo",
    name: "Malmö",
    center_lat: 55.6059,
    center_lon: 13.0007,
    radius_km: 150,
  },
];

describe("se-postal-approx-geocode", () => {
  it("extracts 5-digit postal from Mapbox-style queries", () => {
    expect(extractSePostalDigits("41101, 41101, Sweden")).toBe("41101");
    expect(extractSePostalDigits("41101 Göteborg, 41101, Göteborg, Sweden")).toBe(
      "41101",
    );
    expect(extractSePostalDigits("no postal here")).toBeNull();
  });

  it("places Göteborg 41101 inside Göteborg 50 km radius (not Stockholm)", () => {
    const approx = approxGeocodeSePostal("41101");
    expect(approx?.place).toBe("Göteborg");
    const matches = findMatchingDeliveryZones(
      approx!.lat,
      approx!.lon,
      PROD_MIRROR,
    );
    expect(matches.map((z) => z.name)).toContain("Göteborg");
    expect(matches.map((z) => z.name)).not.toContain("Stockholm");
  });

  it("places Malmö 21115 inside Malmö 150 km radius", () => {
    const approx = approxGeocodeSePostal("21115");
    expect(approx?.place).toBe("Malmö");
    const matches = findMatchingDeliveryZones(
      approx!.lat,
      approx!.lon,
      PROD_MIRROR,
    );
    expect(matches.map((z) => z.name)).toContain("Malmö");
  });

  it("places Kiruna 98131 outside Stockholm / Göteborg / Malmö radii", () => {
    const approx = approxGeocodeSePostal("98131");
    expect(approx?.place).toBe("Kiruna");
    const matches = findMatchingDeliveryZones(
      approx!.lat,
      approx!.lon,
      PROD_MIRROR,
    );
    expect(matches).toHaveLength(0);
  });
});
