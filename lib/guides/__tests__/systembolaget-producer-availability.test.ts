import { describe, expect, it } from "vitest";

import {
  SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK,
  systembolagetAvailabilityLabel,
  systembolagetRangeNote,
} from "@/lib/guides/systembolaget-producer-availability";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";

const REJECTED = [
  "Château Haut Breton Larigaudière",
  "Maison Le Breton",
  "Champagne Cousinat",
  "Michel Cousinat",
  "Four Cousins",
  "Bailly Lapierre",
  "Giuseppe Mascarello",
  "Hans Tschida",
  "Tschida Angerhof",
  "CHAMPAGNE GAUTHEROT",
  "MICHEL TISSOT",
  "Weingut Eva Fricke",
  "Domaine Sylvain Cathiard et Fils",
];

describe("systembolaget producer map", () => {
  it("uses the verified exact producer names", () => {
    expect(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK[101]).toEqual([
      "Domaine Sylvain Pataille",
    ]);
    expect(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK[102]).toEqual([
      "Domaine Catherine et Pierre Breton",
    ]);
    expect(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK[103]).toEqual([
      "Domaine Alice et Olivier De Moor",
    ]);
    expect(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK[114]).toEqual([
      "Testalonga Banditskloof",
    ]);
    expect(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK[56]).toEqual([
      "Weingut Werlitsch - Tscheppe Ewald u. Brigitte",
    ]);
  });

  it("only maps ranks that exist on the list", () => {
    const ranks = new Set(TOP_100_PRODUCERS.map((producer) => producer.rank));
    for (const rank of Object.keys(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK)) {
      expect(ranks.has(Number(rank))).toBe(true);
    }
  });

  it("does not include rejected near matches", () => {
    const names = Object.values(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK).flat();
    for (const rejected of REJECTED) {
      expect(names).not.toContain(rejected);
    }
    expect(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK[29]).toBeUndefined();
    expect(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK[104]).toBeUndefined();
  });

  it("labels one wine without a count and several wines with a count", () => {
    expect(systembolagetAvailabilityLabel(0, "sv")).toBeNull();
    expect(systembolagetAvailabilityLabel(1, "sv")).toBe(
      "Finns på Systembolaget",
    );
    expect(systembolagetAvailabilityLabel(4, "sv")).toBe(
      "Finns på Systembolaget, 4 viner",
    );
    expect(systembolagetAvailabilityLabel(1, "en")).toBe(
      "Available at Systembolaget",
    );
    expect(systembolagetAvailabilityLabel(3, "en")).toBe(
      "Available at Systembolaget, 3 wines",
    );
  });

  it("keeps the range note free of em dashes", () => {
    for (const locale of ["sv", "en"] as const) {
      const note = systembolagetRangeNote(locale);
      const text = `${note.before}${note.link}${note.after}`;
      expect(text).not.toContain("—");
      expect(text).not.toContain("–");
    }
  });
});
