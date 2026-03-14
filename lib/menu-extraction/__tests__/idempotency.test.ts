import { describe, it, expect } from "vitest";

/**
 * Idempotency decision: same content_hash + extraction_status === "completed" => unchanged.
 * Pure logic test (no DB).
 */
function shouldSkipAsUnchanged(
  latestDoc: { content_hash: string | null; extraction_status: string } | null,
  currentHash: string
): boolean {
  if (!latestDoc?.content_hash) return false;
  if (latestDoc.content_hash !== currentHash) return false;
  if (latestDoc.extraction_status !== "completed") return false;
  return true;
}

describe("idempotency decision (same hash => unchanged)", () => {
  it("returns true when latest doc has same hash and extraction completed", () => {
    expect(
      shouldSkipAsUnchanged(
        { content_hash: "abc123", extraction_status: "completed" },
        "abc123"
      )
    ).toBe(true);
  });

  it("returns false when latest doc has different hash", () => {
    expect(
      shouldSkipAsUnchanged(
        { content_hash: "old", extraction_status: "completed" },
        "new"
      )
    ).toBe(false);
  });

  it("returns false when extraction not completed", () => {
    expect(
      shouldSkipAsUnchanged(
        { content_hash: "abc", extraction_status: "failed" },
        "abc"
      )
    ).toBe(false);
    expect(
      shouldSkipAsUnchanged(
        { content_hash: "abc", extraction_status: "pending" },
        "abc"
      )
    ).toBe(false);
  });

  it("returns false when latest doc is null", () => {
    expect(shouldSkipAsUnchanged(null, "abc")).toBe(false);
  });

  it("returns false when latest doc has null content_hash", () => {
    expect(
      shouldSkipAsUnchanged(
        { content_hash: null, extraction_status: "completed" },
        "abc"
      )
    ).toBe(false);
  });
});
