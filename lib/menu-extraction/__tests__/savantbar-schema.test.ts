/**
 * Vitest: Savantbar schema boundary (unknown field drop, validation skip, normalization).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  prepareSavantbarSnapshot,
  prepareSavantbarVinRecord,
  savantbarSourceUpdatedAt,
  SavantbarVinFieldsSchema,
} from "../savantbar-schema";

describe("savantbar-schema", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("drops unknown fields and logs", () => {
    const record = prepareSavantbarVinRecord({
      id: "recTEST",
      createdTime: "2024-01-01T00:00:00.000Z",
      fields: {
        Name: "Test Wine",
        Price: 100,
        "__leaked_secret_field__": "must not persist",
      },
    });
    expect(record).not.toBeNull();
    expect(record!.fields.Name).toBe("Test Wine");
    expect((record!.fields as Record<string, unknown>)["__leaked_secret_field__"]).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      "[savantbar-import] unknown field dropped: __leaked_secret_field__ (Vin record recTEST)",
    );
  });

  it("trims leading tabs on Name and Producer Name", () => {
    const parsed = SavantbarVinFieldsSchema.parse({
      Name: "\t\tChardonnay",
      "Producer Name": ["\tDomaine X"],
    });
    expect(parsed.Name).toBe("Chardonnay");
    expect(parsed["Producer Name"]).toEqual(["Domaine X"]);
  });

  it("keeps Country and Grapes as arrays", () => {
    const parsed = SavantbarVinFieldsSchema.parse({
      Country: ["Frankrike"],
      Grapes: ["Chardonnay", "Pinot Noir"],
    });
    expect(parsed.Country).toEqual(["Frankrike"]);
    expect(parsed.Grapes).toEqual(["Chardonnay", "Pinot Noir"]);
  });

  it("skips invalid records without throwing", () => {
    const snapshot = prepareSavantbarSnapshot({
      fetched_at: new Date().toISOString(),
      source_url: "https://example.com",
      source_slug: "test",
      wines: [
        {
          id: "recBad",
          createdTime: "2024-01-01T00:00:00.000Z",
          fields: { Listed: "not-a-boolean" as unknown as boolean },
        },
        {
          id: "recGood",
          createdTime: "2024-01-01T00:00:00.000Z",
          fields: { Name: "OK", Price: 50, Listed: true },
        },
      ],
      other: [],
      producers: [],
    });
    expect(snapshot.wines).toHaveLength(1);
    expect(snapshot.wines[0]!.id).toBe("recGood");
    expect(snapshot.prepare_stats.wines_skipped).toBe(1);
  });

  it("maps Last Updated to ISO source_updated_at helper", () => {
    expect(
      savantbarSourceUpdatedAt({ "Last Updated": "2026-07-01T10:22:34.000Z" }),
    ).toBe("2026-07-01T10:22:34.000Z");
    expect(savantbarSourceUpdatedAt({})).toBeNull();
  });
});
