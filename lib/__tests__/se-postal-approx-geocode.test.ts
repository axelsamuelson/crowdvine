import { describe, expect, it } from "vitest";
import {
  approxGeocodeSePostal,
  extractSePostalDigits,
} from "@/lib/se-postal-approx-geocode";
import {
  calculateDistanceKm,
  findMatchingDeliveryZones,
} from "@/lib/zone-matching";
import type { DeliveryZoneGeoRow } from "@/lib/zone-matching";

/** Prod pallet-zone mirror (coords/radii from ops). */
const PROD_ZONES: DeliveryZoneGeoRow[] = [
  {
    id: "z-sthlm",
    name: "Stockholm",
    center_lat: 59.3304,
    center_lon: 18.0587,
    radius_km: 50,
  },
  {
    id: "z-gbg",
    name: "Göteborg",
    center_lat: 57.7072,
    center_lon: 11.967,
    radius_km: 50,
  },
  {
    id: "z-gothenburg",
    name: "Gothenburg",
    center_lat: 57.7089,
    center_lon: 11.9746,
    radius_km: 150,
  },
  {
    id: "z-malmo",
    name: "Malmö",
    center_lat: 55.6059,
    center_lon: 13.0007,
    radius_km: 150,
  },
  {
    id: "z-helsingborg",
    name: "Helsingborg",
    center_lat: 56.0467,
    center_lon: 12.6944,
    radius_km: 100,
  },
  {
    id: "z-linkoping",
    name: "Linköping",
    center_lat: 58.4108,
    center_lon: 15.6214,
    radius_km: 100,
  },
  {
    id: "z-orebro",
    name: "Örebro",
    center_lat: 59.2741,
    center_lon: 15.2066,
    radius_km: 100,
  },
  {
    id: "z-uppsala",
    name: "Uppsala",
    center_lat: 59.8586,
    center_lon: 17.6389,
    radius_km: 100,
  },
  {
    id: "z-vasteras",
    name: "Västerås",
    center_lat: 59.6099,
    center_lon: 16.5448,
    radius_km: 40,
  },
];

function matchesForBand(postal5: string) {
  const approx = approxGeocodeSePostal(postal5);
  expect(approx).not.toBeNull();
  return {
    approx: approx!,
    matches: findMatchingDeliveryZones(approx!.lat, approx!.lon, PROD_ZONES),
  };
}

describe("se-postal-approx-geocode", () => {
  it("extracts 5-digit postal from Mapbox-style queries", () => {
    expect(extractSePostalDigits("41101, 41101, Sweden")).toBe("41101");
    expect(
      extractSePostalDigits("41101 Göteborg, 41101, Göteborg, Sweden"),
    ).toBe("41101");
    expect(extractSePostalDigits("no postal here")).toBeNull();
  });

  it("covers all PostNord bands 10–98 except unused 32/48/49", () => {
    const unused = new Set(["32", "48", "49"]);
    for (let i = 10; i <= 98; i++) {
      const band = String(i);
      const hit = approxGeocodeSePostal(`${band}000`);
      if (unused.has(band)) {
        expect(hit).toBeNull();
      } else {
        expect(hit?.band).toBe(band);
        expect(hit?.place).toBeTruthy();
      }
    }
  });

  it("never guesses Stockholm for unused or non-Stockholm bands", () => {
    expect(approxGeocodeSePostal("32000")).toBeNull();
    expect(approxGeocodeSePostal("48000")).toBeNull();
    expect(approxGeocodeSePostal("49000")).toBeNull();
    expect(approxGeocodeSePostal("99000")).toBeNull();
    expect(approxGeocodeSePostal("41101")?.place).not.toBe("Stockholm");
    expect(approxGeocodeSePostal("21115")?.place).not.toBe("Stockholm");
    expect(approxGeocodeSePostal("15000")?.place).toBe("Södertälje");
    expect(approxGeocodeSePostal("43000")?.place).toBe("Kungsbacka");
    expect(approxGeocodeSePostal("44000")?.place).toBe("Kungälv");
  });

  it("places Göteborg 41101 inside Göteborg 50 km radius (not Stockholm)", () => {
    const { approx, matches } = matchesForBand("41101");
    expect(approx.place).toBe("Göteborg");
    expect(matches.map((z) => z.name)).toContain("Göteborg");
    expect(matches.map((z) => z.name)).not.toContain("Stockholm");
  });

  it("places Malmö 21115 inside Malmö 150 km radius", () => {
    const { approx, matches } = matchesForBand("21115");
    expect(approx.place).toBe("Malmö");
    expect(matches.map((z) => z.name)).toContain("Malmö");
  });

  it("places Kiruna 98131 outside all prod pallet radii", () => {
    const { approx, matches } = matchesForBand("98131");
    expect(approx.place).toBe("Kiruna");
    expect(matches).toHaveLength(0);
  });

  it("24 Eslöv matches a pallet zone (Malmö/Helsingborg)", () => {
    const { approx, matches } = matchesForBand("24100");
    expect(approx.place).toBe("Eslöv");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.map((z) => z.name)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Malmö|Helsingborg/)]),
    );
  });

  it("26 Ängelholm matches a pallet zone (Helsingborg/Malmö)", () => {
    const { approx, matches } = matchesForBand("26200");
    expect(approx.place).toBe("Ängelholm");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("46 Trollhättan matches Gothenburg 150 km pallet zone", () => {
    const { approx, matches } = matchesForBand("46100");
    expect(approx.place).toBe("Trollhättan");
    expect(matches.map((z) => z.name)).toContain("Gothenburg");
    const gbg150 = PROD_ZONES.find((z) => z.name === "Gothenburg")!;
    const d = calculateDistanceKm(
      approx.lat,
      approx.lon,
      gbg150.center_lat!,
      gbg150.center_lon!,
    );
    expect(d).toBeLessThanOrEqual(150);
  });

  it("50 Borås matches Gothenburg 150 km pallet zone", () => {
    const { approx, matches } = matchesForBand("50100");
    expect(approx.place).toBe("Borås");
    expect(matches.map((z) => z.name)).toContain("Gothenburg");
  });

  it("98 Kiruna has no pallet zone", () => {
    const { matches } = matchesForBand("98131");
    expect(matches).toHaveLength(0);
  });

  it("62 Visby (Gotland) has no pallet zone", () => {
    const { approx, matches } = matchesForBand("62100");
    expect(approx.place).toBe("Visby");
    expect(matches).toHaveLength(0);
  });

  it("83 Östersund has no pallet zone", () => {
    const { approx, matches } = matchesForBand("83100");
    expect(approx.place).toBe("Östersund");
    expect(matches).toHaveLength(0);
  });
});
