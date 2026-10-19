import { describe, expect, it } from "vitest";
import {
  buildLatestPalletShippedAtByWineId,
  compareByPalletShippedAt,
  isCreatedAtShopSort,
  sortProductsByPalletShippedAt,
} from "@/lib/b2b-pallet-shipped-sort";

describe("buildLatestPalletShippedAtByWineId", () => {
  it("keeps the latest shipped_at per wine", () => {
    const map = buildLatestPalletShippedAtByWineId([
      {
        wine_id: "w1",
        b2b_pallet_shipments: { shipped_at: "2024-01-01T00:00:00.000Z" },
      },
      {
        wine_id: "w1",
        b2b_pallet_shipments: { shipped_at: "2025-06-01T00:00:00.000Z" },
      },
      {
        wine_id: "w2",
        b2b_pallet_shipments: { shipped_at: "2023-01-01T00:00:00.000Z" },
      },
    ]);

    expect(map.get("w1")).toBe(Date.parse("2025-06-01T00:00:00.000Z"));
    expect(map.get("w2")).toBe(Date.parse("2023-01-01T00:00:00.000Z"));
  });

  it("ignores null shipped_at and wines without id", () => {
    const map = buildLatestPalletShippedAtByWineId([
      { wine_id: "w1", b2b_pallet_shipments: { shipped_at: null } },
      { wine_id: null, b2b_pallet_shipments: { shipped_at: "2025-01-01T00:00:00.000Z" } },
      {
        wine_id: "w2",
        b2b_pallet_shipments: [{ shipped_at: "2024-05-01T00:00:00.000Z" }],
      },
    ]);

    expect(map.has("w1")).toBe(false);
    expect(map.get("w2")).toBe(Date.parse("2024-05-01T00:00:00.000Z"));
  });
});

describe("sortProductsByPalletShippedAt", () => {
  const map = new Map<string, number | null>([
    ["new", Date.parse("2025-01-01T00:00:00.000Z")],
    ["old", Date.parse("2020-01-01T00:00:00.000Z")],
  ]);

  it("sorts newest first when reverse=true", () => {
    const sorted = sortProductsByPalletShippedAt(
      [{ id: "old" }, { id: "new" }, { id: "none" }],
      map,
      true,
    );
    expect(sorted.map((p) => p.id)).toEqual(["new", "old", "none"]);
  });

  it("sorts oldest first when reverse=false", () => {
    const sorted = sortProductsByPalletShippedAt(
      [{ id: "new" }, { id: "none" }, { id: "old" }],
      map,
      false,
    );
    expect(sorted.map((p) => p.id)).toEqual(["old", "new", "none"]);
  });

  it("puts wines without shipped pallet last in both directions", () => {
    expect(
      compareByPalletShippedAt("none", "old", map, true),
    ).toBeGreaterThan(0);
    expect(
      compareByPalletShippedAt("none", "old", map, false),
    ).toBeGreaterThan(0);
  });
});

describe("isCreatedAtShopSort", () => {
  it("recognizes Newest/Oldest mapped keys", () => {
    expect(isCreatedAtShopSort("CREATED_AT")).toBe(true);
    expect(isCreatedAtShopSort("CREATED")).toBe(true);
    expect(isCreatedAtShopSort("PRICE")).toBe(false);
    expect(isCreatedAtShopSort("RELEVANCE")).toBe(false);
  });
});
