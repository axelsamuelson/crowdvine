import { describe, expect, it } from "vitest";
import { computeAuthorityScore } from "@/lib/seo/domain-authority-score";

describe("computeAuthorityScore", () => {
  it("scores 0 when no signals", () => {
    expect(
      computeAuthorityScore({
        openPageRank: null,
        referringDomains: null,
        gscImpressions28d: null,
        sitemapUrlCount: null,
      }).score,
    ).toBe(0);
  });

  it("maps OPR 5.0 to component 50 and uses it alone when others missing", () => {
    const r = computeAuthorityScore({
      openPageRank: 5,
      referringDomains: null,
      gscImpressions28d: null,
      sitemapUrlCount: null,
    });
    expect(r.components.openPageRank).toBe(50);
    expect(r.score).toBe(50);
    expect(r.usedWeights.openPageRank).toBe(1);
  });

  it("renormalizes weights when some signals missing", () => {
    const r = computeAuthorityScore({
      openPageRank: 4,
      referringDomains: null,
      gscImpressions28d: 10_000,
      sitemapUrlCount: null,
    });
    expect(r.usedWeights.openPageRank).toBeCloseTo(0.4 / 0.7, 2);
    expect(r.usedWeights.gscImpressions).toBeCloseTo(0.3 / 0.7, 2);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
