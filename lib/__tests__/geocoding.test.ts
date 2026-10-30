import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearGeocodeCache,
  geocodeAddress,
  isValidCoordinates,
} from "@/lib/geocoding";

describe("geocoding (Mapbox)", () => {
  const originalFetch = global.fetch;
  const originalMapbox = process.env.MAPBOX_ACCESS_TOKEN;
  const originalPublic = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  beforeEach(() => {
    clearGeocodeCache();
    process.env.MAPBOX_ACCESS_TOKEN = "pk.test-token";
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    if (originalMapbox === undefined) {
      delete process.env.MAPBOX_ACCESS_TOKEN;
    } else {
      process.env.MAPBOX_ACCESS_TOKEN = originalMapbox;
    }
    if (originalPublic === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = originalPublic;
    }
    clearGeocodeCache();
  });

  it("maps Mapbox feature center/context into GeocodeResult", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            center: [18.0686, 59.3293],
            place_name: "Drottninggatan 1, 111 51 Stockholm, Sweden",
            text: "Drottninggatan",
            address: "1",
            context: [
              { id: "postcode.1", text: "111 51" },
              { id: "place.1", text: "Stockholm" },
              { id: "country.1", text: "Sweden", short_code: "se" },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await geocodeAddress("Drottninggatan 1, Stockholm");

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.lat).toBe(59.3293);
    expect(result.lon).toBe(18.0686);
    expect(result.display_name).toContain("Stockholm");
    expect(result.address?.city).toBe("Stockholm");
    expect(result.address?.postcode).toBe("111 51");
    expect(result.address?.country_code).toBe("SE");
    expect(result.address?.house_number).toBe("1");
    expect(result.address?.road).toBe("Drottninggatan");

    const calledUrl = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(calledUrl).toContain("api.mapbox.com/geocoding/v5/mapbox.places/");
    expect(calledUrl).toContain("access_token=pk.test-token");
    expect(calledUrl.startsWith("https://api.mapbox.com/")).toBe(true);
  });

  it("returns GEOCODING_UNAVAILABLE when Mapbox token is missing", async () => {
    delete process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    global.fetch = vi.fn() as unknown as typeof fetch;

    const result = await geocodeAddress("Somewhere, Sweden");

    expect(result).toMatchObject({
      error: "GEOCODING_UNAVAILABLE",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns NO_RESULTS then GEOCODING_FAILED when Mapbox has no features", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    }) as unknown as typeof fetch;

    const result = await geocodeAddress("Totally Unknown Place XYZ");

    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(["NO_RESULTS", "GEOCODING_FAILED"]).toContain(result.error);
  });

  it("isValidCoordinates rejects out-of-range values", () => {
    expect(isValidCoordinates(59.3, 18.0)).toBe(true);
    expect(isValidCoordinates(91, 0)).toBe(false);
    expect(isValidCoordinates(0, 181)).toBe(false);
  });
});
