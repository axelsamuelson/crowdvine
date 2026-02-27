import { describe, it, expect } from "vitest";
import {
  scoreMatch,
  isAboveThreshold,
  evaluateMatch,
  scoreMatchWithBreakdown,
  MATCH_THRESHOLD,
} from "../match";
import type { WineForMatch } from "../types";

describe("match", () => {
  const wine: WineForMatch = {
    id: "w1",
    wine_name: "Puligny-Montrachet 1er Cru",
    vintage: "2020",
    producer: { name: "Domaine Leflaive" },
  };

  it("scores higher when producer and name match PDP title than when they do not", () => {
    const matchTitle = "Domaine Leflaive Puligny-Montrachet 1er Cru 2020";
    const noMatchTitle = "Some Other Producer Random Wine 2019";
    const scoreMatchTitle = scoreMatch(wine, matchTitle);
    const scoreNoMatch = scoreMatch(wine, noMatchTitle);
    expect(scoreMatchTitle).toBeGreaterThan(scoreNoMatch);
    expect(scoreMatchTitle).toBeGreaterThanOrEqual(0.4);
    expect(scoreNoMatch).toBeLessThan(0.6);
  });

  it("scores lower when only partial match", () => {
    const pdpTitle = "Some Other Producer Random Wine 2019";
    const score = scoreMatch(wine, pdpTitle);
    expect(score).toBeLessThan(0.6);
    expect(isAboveThreshold(wine, pdpTitle, 0.6)).toBe(false);
  });

  it("vintage match contributes to score", () => {
    const withVintage = "Domaine Leflaive Puligny-Montrachet 2020";
    const wrongVintage = "Domaine Leflaive Puligny-Montrachet 2019";
    const s1 = scoreMatch(wine, withVintage);
    const s2 = scoreMatch(wine, wrongVintage);
    expect(s1).toBeGreaterThanOrEqual(s2);
  });

  it("isAboveThreshold respects custom threshold", () => {
    const pdpTitle = "Domaine Leflaive Puligny-Montrachet 1er Cru 2020";
    expect(isAboveThreshold(wine, pdpTitle, 0.3)).toBe(true);
    expect(isAboveThreshold(wine, pdpTitle, 1.01)).toBe(false);
  });

  it("MATCH_THRESHOLD is 0.35 (allows same wine, other vintages)", () => {
    expect(MATCH_THRESHOLD).toBe(0.35);
  });

  it("returns 0-1 range", () => {
    const score = scoreMatch(wine, "Domaine Leflaive Puligny-Montrachet 2020");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  describe("evaluateMatch and reject rules", () => {
    it("accepts when score above threshold and no reject rule", () => {
      const offer = {
        titleRaw: "Domaine Leflaive Puligny-Montrachet 1er Cru 2020",
        pdpUrl: "https://example.com/p",
        priceAmount: 899,
        currency: "SEK",
        available: true,
      };
      const r = evaluateMatch(wine, offer, { threshold: 0.5 });
      expect(r.accepted).toBe(true);
      expect(r.rejectReason).toBeNull();
      expect(r.score).toBeGreaterThanOrEqual(0.5);
    });

    it("allows same wine with different vintage (no vintage_mismatch reject)", () => {
      const offer = {
        titleRaw: "Domaine Leflaive Puligny-Montrachet 1er Cru 2019",
        pdpUrl: "https://example.com/p",
        priceAmount: 899,
        currency: "SEK",
        available: true,
      };
      const r = evaluateMatch(wine, offer, { threshold: 0 });
      expect(r.rejectReason).not.toBe("vintage_mismatch");
      expect(r.breakdown.vintageOur).toBe("2020");
      expect(r.breakdown.vintagePdp).toBe("2019");
      expect(r.score).toBeGreaterThan(0);
      expect(r.accepted).toBe(true);
    });

    it("rejects when sizes differ when both have size", () => {
      const wineWithSize: WineForMatch = {
        ...wine,
        wine_name: "Puligny 750ml",
      };
      const offer = {
        titleRaw: "Domaine Leflaive Puligny 1500ml",
        pdpUrl: "https://example.com/p",
        priceAmount: 100,
        currency: "SEK",
        available: true,
        size: "1500ml",
      };
      const r = evaluateMatch(wineWithSize, offer, { threshold: 0.6 });
      expect(r.accepted).toBe(false);
      expect(r.rejectReason).toBe("size_mismatch");
    });

    it("scoreMatchWithBreakdown returns breakdown", () => {
      const { score, breakdown } = scoreMatchWithBreakdown(wine, "Domaine Leflaive Puligny-Montrachet 2020");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(breakdown.vintageOur).toBe("2020");
      expect(breakdown.vintagePdp).toBe("2020");
      expect(breakdown.producerScore).toBeGreaterThan(0);
      expect(breakdown.wineNameScore).toBeGreaterThan(0);
    });
  });
});
