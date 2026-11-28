import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
const getSupabaseAdmin = vi.fn(() => ({ from: fromMock }));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => getSupabaseAdmin(),
}));

vi.mock("@/lib/pallet-fill-count", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pallet-fill-count")>(
    "@/lib/pallet-fill-count",
  );
  return {
    ...actual,
    sumReservedBottlesOnPalletsResult: vi.fn(),
    sumReservedBottlesOnPallet: vi.fn(),
    sumReservedBottlesOnPalletResult: vi.fn(),
  };
});

import {
  sumReservedBottlesOnPalletsResult,
} from "@/lib/pallet-fill-count";
import { findOrCreatePalletForRegion } from "@/lib/pallet-auto-management";
import {
  isSePostalOnlyGeocodeQuery,
  clearGeocodeCache,
  geocodeAddress,
} from "@/lib/geocoding";

describe("isSePostalOnlyGeocodeQuery", () => {
  it("accepts checkout guest postal-only strings", () => {
    expect(isSePostalOnlyGeocodeQuery("41101, 41101, Sweden")).toBe(true);
    expect(isSePostalOnlyGeocodeQuery("41101 41101, 41101, Sweden")).toBe(true);
    expect(isSePostalOnlyGeocodeQuery("11151, Sweden")).toBe(true);
  });

  it("rejects street or city names (keep Mapbox)", () => {
    expect(isSePostalOnlyGeocodeQuery("Drottninggatan 1, Stockholm")).toBe(
      false,
    );
    expect(isSePostalOnlyGeocodeQuery("41101 Göteborg, Sweden")).toBe(false);
  });
});

describe("geocodeAddress SE postal-only fast path", () => {
  const originalFetch = global.fetch;
  const originalMapbox = process.env.MAPBOX_ACCESS_TOKEN;

  beforeEach(() => {
    clearGeocodeCache();
    process.env.MAPBOX_ACCESS_TOKEN = "pk.test-token";
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalMapbox === undefined) {
      delete process.env.MAPBOX_ACCESS_TOKEN;
    } else {
      process.env.MAPBOX_ACCESS_TOKEN = originalMapbox;
    }
    clearGeocodeCache();
  });

  it("skips Mapbox for postal-only SE and returns Göteborg for 41101", async () => {
    const result = await geocodeAddress("41101, 41101, Sweden");
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.address?.city).toBe("Göteborg");
    expect(result.lat).toBeCloseTo(57.7089, 2);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("still calls Mapbox for street addresses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            center: [18.0686, 59.3293],
            place_name: "Drottninggatan 1, Stockholm, Sweden",
            text: "Drottninggatan",
            address: "1",
            context: [
              { id: "place.1", text: "Stockholm" },
              { id: "country.1", text: "Sweden", short_code: "se" },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    await geocodeAddress("Drottninggatan 1, Stockholm");
    expect(global.fetch).toHaveBeenCalled();
  });
});

describe("findOrCreatePalletForRegion hot path", () => {
  beforeEach(() => {
    fromMock.mockReset();
    vi.mocked(sumReservedBottlesOnPalletsResult).mockReset();
  });

  it("finds an accepting pallet without loading region/zone names", async () => {
    const palletSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "pallet-gbg",
            name: "TEST Göteborg Open Pallet",
            bottle_capacity: 600,
            min_bottles_to_complete: 120,
            cost_cents: 50000,
            last_mile_cost_cents_per_bottle: 0,
            status: "open",
            current_pickup_producer: null,
          },
        ],
        error: null,
      }),
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "pallets") {
        return { select: palletSelect };
      }
      // Region/zone name tables must not be touched on the find path.
      throw new Error(`unexpected table on find path: ${table}`);
    });

    vi.mocked(sumReservedBottlesOnPalletsResult).mockResolvedValue({
      ok: true,
      byPallet: new Map([["pallet-gbg", 42]]),
    });

    const result = await findOrCreatePalletForRegion(
      "region-1",
      "zone-gbg",
    );

    expect(result.palletId).toBe("pallet-gbg");
    expect(result.created).toBe(false);
    expect(result.reservedBottles).toBe(42);
    expect(result.palletRow?.id).toBe("pallet-gbg");
    expect(sumReservedBottlesOnPalletsResult).toHaveBeenCalledWith([
      "pallet-gbg",
    ]);
    expect(fromMock).toHaveBeenCalledWith("pallets");
    expect(fromMock).not.toHaveBeenCalledWith("shipping_regions");
    expect(fromMock).not.toHaveBeenCalledWith("pallet_zones");
  });
});
