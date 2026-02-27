import { describe, it, expect } from "vitest";
import {
  normalizeForMatch,
  extractVintage,
  extractSize,
  normalizeProducer,
  normalizeWineName,
  normalizePdpTitle,
} from "../normalize";

describe("normalize", () => {
  describe("normalizeForMatch", () => {
    it("lowercases and trims", () => {
      expect(normalizeForMatch("  Château Margaux  ")).toBe("chateau margaux");
    });
    it("collapses multiple spaces", () => {
      expect(normalizeForMatch("a   b   c")).toBe("a b c");
    });
    it("strips accents", () => {
      expect(normalizeForMatch("Cuvée Réservée")).toBe("cuvee reservee");
    });
    it("returns empty for null/undefined", () => {
      expect(normalizeForMatch("")).toBe("");
      expect(normalizeForMatch(null as unknown as string)).toBe("");
      expect(normalizeForMatch(undefined as unknown as string)).toBe("");
    });
  });

  describe("extractVintage", () => {
    it("extracts 4-digit year", () => {
      expect(extractVintage("Wine Name 2022")).toBe("2022");
      expect(extractVintage("2020 Vintage")).toBe("2020");
      expect(extractVintage("1999")).toBe("1999");
    });
    it("returns null when no year", () => {
      expect(extractVintage("No Year Here")).toBeNull();
    });
  });

  describe("extractSize", () => {
    it("extracts 75cl / 750ml", () => {
      expect(extractSize("Bottle 75cl")).toBe("75cl");
      expect(extractSize("750ml")).toBe("750ml");
    });
    it("returns null when no size", () => {
      expect(extractSize("No size")).toBeNull();
    });
  });

  describe("normalizeProducer", () => {
    it("normalizes producer name", () => {
      expect(normalizeProducer("  Domaine Leflaive  ")).toBe("domaine leflaive");
    });
    it("handles null/undefined", () => {
      expect(normalizeProducer(null)).toBe("");
      expect(normalizeProducer(undefined)).toBe("");
    });
  });

  describe("normalizeWineName", () => {
    it("normalizes wine name", () => {
      expect(normalizeWineName("  Puligny-Montrachet 1er Cru  ")).toBe("puligny-montrachet 1er cru");
    });
  });

  describe("normalizePdpTitle", () => {
    it("strips content after | (store suffix), keeps Producer - Wine Name", () => {
      expect(normalizePdpTitle("Wine Name 2022 | Shop Name")).toBe("wine name 2022");
      expect(normalizePdpTitle("Le Bouc - Miss Piggy Blues 2019")).toBe("le bouc - miss piggy blues 2019");
    });
  });
});
