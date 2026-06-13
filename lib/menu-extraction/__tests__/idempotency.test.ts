import { describe, it, expect } from "vitest";
import {
  isPdfAlreadyExtracted,
  isSamePdfAwaitingExtraction,
  shouldSkipExtractionAsDuplicate,
} from "../pdf-idempotency";

describe("isPdfAlreadyExtracted", () => {
  it("returns true when same hash and extraction completed", () => {
    expect(
      isPdfAlreadyExtracted(
        { content_hash: "abc123", extraction_status: "completed" },
        "abc123",
      ),
    ).toBe(true);
  });

  it("returns false when hash differs or extraction incomplete", () => {
    expect(
      isPdfAlreadyExtracted(
        { content_hash: "old", extraction_status: "completed" },
        "new",
      ),
    ).toBe(false);
    expect(
      isPdfAlreadyExtracted(
        { content_hash: "abc", extraction_status: "failed" },
        "abc",
      ),
    ).toBe(false);
    expect(isPdfAlreadyExtracted(null, "abc")).toBe(false);
  });
});

describe("isSamePdfAwaitingExtraction", () => {
  it("returns true for pending/failed with same hash", () => {
    expect(
      isSamePdfAwaitingExtraction(
        { content_hash: "abc", extraction_status: "pending" },
        "abc",
      ),
    ).toBe(true);
  });

  it("returns false when already completed", () => {
    expect(
      isSamePdfAwaitingExtraction(
        { content_hash: "abc", extraction_status: "completed" },
        "abc",
      ),
    ).toBe(false);
  });
});

describe("shouldSkipExtractionAsDuplicate", () => {
  it("skips when another doc with same hash is completed", () => {
    expect(
      shouldSkipExtractionAsDuplicate(
        { id: "b", content_hash: "x", source_slug: "foo" },
        { id: "a" },
      ),
    ).toBe(true);
  });

  it("does not skip the canonical completed doc", () => {
    expect(
      shouldSkipExtractionAsDuplicate(
        { id: "a", content_hash: "x", source_slug: "foo" },
        { id: "a" },
      ),
    ).toBe(false);
  });
});
