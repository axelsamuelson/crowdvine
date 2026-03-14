import { describe, it, expect } from "vitest";
import type { ManualRunStep } from "../types";

describe("ManualRunStep schema shape", () => {
  it("has required fields: name, started_at, finished_at, ok", () => {
    const step: ManualRunStep = {
      name: "resolve_pdf_url",
      started_at: "2026-01-01T00:00:00.000Z",
      finished_at: "2026-01-01T00:00:01.000Z",
      ok: true,
    };
    expect(step).toHaveProperty("name");
    expect(step).toHaveProperty("started_at");
    expect(step).toHaveProperty("finished_at");
    expect(step).toHaveProperty("ok");
    expect(typeof step.name).toBe("string");
    expect(typeof step.started_at).toBe("string");
    expect(typeof step.finished_at).toBe("string");
    expect(typeof step.ok).toBe("boolean");
  });

  it("may have optional summary (object)", () => {
    const step: ManualRunStep = {
      name: "download_pdf",
      started_at: "2026-01-01T00:00:00.000Z",
      finished_at: "2026-01-01T00:00:02.000Z",
      ok: true,
      summary: { bytes: 12345 },
    };
    expect(step.summary).toEqual({ bytes: 12345 });
  });

  it("may have optional error (string)", () => {
    const step: ManualRunStep = {
      name: "ai_extraction",
      started_at: "2026-01-01T00:00:00.000Z",
      finished_at: "2026-01-01T00:00:05.000Z",
      ok: false,
      error: "Invalid JSON",
    };
    expect(step.error).toBe("Invalid JSON");
  });
});
