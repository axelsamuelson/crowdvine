import { describe, expect, it } from "vitest";
import { diffSavantbarSnapshots, formatSavantbarDiffSummary } from "../savantbar-diff";
import type { SavantbarPreparedSnapshot } from "../savantbar-schema";

function wine(
  id: string,
  fields: {
    Name: string;
    "Producer Name": string;
    Price: number;
    Listed?: boolean;
    Delisted?: boolean;
  },
) {
  return {
    id,
    createdTime: "2026-01-01T00:00:00.000Z",
    fields: {
      Listed: true,
      Delisted: false,
      ...fields,
    },
  };
}

function snapshot(
  wines: ReturnType<typeof wine>[],
): SavantbarPreparedSnapshot {
  return {
    fetched_at: "2026-01-01T00:00:00.000Z",
    source_url: "https://flasklista.savantbar.se/en",
    source_slug: "savant-bar-kaffe-and-vin",
    wines,
    other: [],
    producers: [],
    prepare_stats: {
      wines_in: wines.length,
      wines_out: wines.length,
      wines_skipped: 0,
      other_in: 0,
      other_out: 0,
      other_skipped: 0,
      unknown_fields_dropped: [],
    },
  };
}

describe("diffSavantbarSnapshots", () => {
  it("detects added, removed, and price changes by savantbar_id", () => {
    const oldSnap = snapshot([
      wine("recA", { Name: "Chablis", "Producer Name": "Domaine A", Price: 900 }),
      wine("recB", { Name: "Meursault", "Producer Name": "Domaine B", Price: 1200 }),
    ]);
    const newSnap = snapshot([
      wine("recA", { Name: "Chablis", "Producer Name": "Domaine A", Price: 950 }),
      wine("recC", { Name: "Puligny", "Producer Name": "Domaine C", Price: 1400 }),
    ]);

    const diff = diffSavantbarSnapshots(oldSnap, newSnap);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]?.savantbar_id).toBe("recC");
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]?.savantbar_id).toBe("recB");
    expect(diff.priceChanges).toHaveLength(1);
    expect(diff.priceChanges[0]).toMatchObject({
      savantbar_id: "recA",
      old_price: 900,
      new_price: 950,
    });
    expect(diff.hasChanges).toBe(true);
    expect(formatSavantbarDiffSummary(diff)).toBe(
      "Savant: 1 new wines, 1 removed, 1 price changes.",
    );
  });

  it("treats null old snapshot as all added", () => {
    const newSnap = snapshot([
      wine("recA", { Name: "Chablis", "Producer Name": "Domaine A", Price: 900 }),
    ]);
    const diff = diffSavantbarSnapshots(null, newSnap);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(0);
    expect(diff.priceChanges).toHaveLength(0);
  });

  it("ignores delisted wines", () => {
    const oldSnap = snapshot([
      wine("recA", {
        Name: "Gone",
        "Producer Name": "X",
        Price: 100,
        Delisted: true,
      }),
    ]);
    const newSnap = snapshot([]);
    const diff = diffSavantbarSnapshots(oldSnap, newSnap);
    expect(diff.hasChanges).toBe(false);
  });
});
