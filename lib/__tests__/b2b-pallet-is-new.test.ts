import { describe, expect, it } from "vitest";

/** Mirrors fetchB2BWineIsNew aggregation for unit coverage without Supabase. */
function wineIdsMarkedNew(
  rows: Array<{ wine_id?: string | null }>,
): Set<string> {
  const result = new Set<string>();
  for (const row of rows) {
    if (typeof row.wine_id === "string" && row.wine_id) {
      result.add(row.wine_id);
    }
  }
  return result;
}

describe("B2B pallet is_new wine ids", () => {
  it("collects unique wine ids from is_new pallet rows", () => {
    const set = wineIdsMarkedNew([
      { wine_id: "w1" },
      { wine_id: "w1" },
      { wine_id: "w2" },
      { wine_id: null },
      {},
    ]);
    expect([...set].sort()).toEqual(["w1", "w2"]);
  });

  it("returns empty for no rows", () => {
    expect(wineIdsMarkedNew([]).size).toBe(0);
  });
});
