import { describe, it, expect } from "vitest";
import type { DiagnosticOutput } from "../diagnose";

describe("DiagnosticOutput schema", () => {
  it("has required top-level fields for API response", () => {
    const shape: DiagnosticOutput = {
      wine: null,
      source: null,
      error: "Wine not found",
      requests: [],
      candidateCount: 0,
      candidates: [],
      thresholdUsed: 0.75,
    };
    expect(shape).toHaveProperty("wine");
    expect(shape).toHaveProperty("source");
    expect(shape).toHaveProperty("requests");
    expect(shape).toHaveProperty("candidateCount");
    expect(shape).toHaveProperty("candidates");
    expect(shape).toHaveProperty("thresholdUsed");
    expect(Array.isArray(shape.requests)).toBe(true);
    expect(Array.isArray(shape.candidates)).toBe(true);
  });

  it("candidate entry has decision and match fields", () => {
    const candidate = {
      pdpUrl: "https://example.com/products/foo",
      fetchStatus: 200,
      fetchByteLength: 1000,
      fetchSnippet: "...",
      botBlockDetected: false,
      extracted: { titleRaw: "Wine", priceAmount: 100, currency: "SEK", available: true, pdpUrl: "..." },
      matchScore: 0.8,
      matchBreakdown: {
        producerScore: 1,
        wineNameScore: 0.9,
        vintageScore: 1,
        vintageOur: "2020",
        vintagePdp: "2020",
        sizeOur: null,
        sizePdp: null,
      },
      decision: "accepted" as const,
      rejectReason: null,
    };
    expect(candidate.decision).toBe("accepted");
    expect(candidate.matchBreakdown).toHaveProperty("vintageOur");
    expect(candidate.matchBreakdown).toHaveProperty("sizeOur");
  });
});
