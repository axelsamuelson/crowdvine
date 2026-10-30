import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  computeOptimalPickupByAverageDriveTime,
  fetchDrivingDurationMatrix,
  fetchDrivingRoutesFromPickup,
  type DurationMatrixResult,
} from "@/lib/driving-routes";

describe("driving-routes (Mapbox only)", () => {
  const originalFetch = global.fetch;
  const originalMapbox = process.env.MAPBOX_ACCESS_TOKEN;
  const originalPublic = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  beforeEach(() => {
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
  });

  it("returns null from fetchDrivingDurationMatrix when token is missing", async () => {
    delete process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    global.fetch = vi.fn() as unknown as typeof fetch;

    const result = await fetchDrivingDurationMatrix([
      { id: "a", lat: 59.3, lon: 18.0 },
      { id: "b", lat: 59.4, lon: 18.1 },
    ]);

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns null from fetchDrivingRoutesFromPickup when Mapbox fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    }) as unknown as typeof fetch;

    const result = await fetchDrivingRoutesFromPickup(
      { lat: 59.3, lon: 18.0 },
      [{ id: "dest", lat: 59.4, lon: 18.1 }],
    );

    expect(result).toBeNull();
    const calledUrl = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(calledUrl).toContain("api.mapbox.com/directions-matrix");
    expect(calledUrl.startsWith("https://api.mapbox.com/")).toBe(true);
  });

  it("returns Mapbox routes when Matrix API succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "Ok",
        // sources=0&destinations=N returns one column per destination (not the full square)
        distances: [[12500]],
        durations: [[900]],
      }),
    }) as unknown as typeof fetch;

    const result = await fetchDrivingRoutesFromPickup(
      { lat: 59.3, lon: 18.0 },
      [{ id: "dest", lat: 59.4, lon: 18.1 }],
    );

    expect(result).toEqual({
      dest: {
        distanceMeters: 12500,
        durationSeconds: 900,
        source: "mapbox",
      },
    });
  });

  it("computeOptimalPickupByAverageDriveTime picks lowest average", () => {
    const matrix: DurationMatrixResult = {
      producerIds: ["a", "b", "c"],
      durations: [
        [0, 100, 300],
        [100, 0, 100],
        [300, 100, 0],
      ],
      source: "mapbox",
    };

    const optimal = computeOptimalPickupByAverageDriveTime(matrix);
    expect(optimal?.optimalProducerId).toBe("b");
    expect(optimal?.source).toBe("mapbox");
  });
});
