import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BEGINNER_PICKS,
  beginnerPickCopy,
} from "@/lib/guides/worlds-best-beginner-picks";

describe("BEGINNER_PICKS", () => {
  it("lists the ten product numbers in the required order", () => {
    expect(BEGINNER_PICKS.map((pick) => pick.productNumber)).toEqual([
      "7036101",
      "9351401",
      "2011001",
      "9287501",
      "9348401",
      "9220601",
      "7540801",
      "5808601",
      "9112801",
      "5924801",
    ]);
  });

  it("has no em dash or en dash in beginner copy", () => {
    const strings = BEGINNER_PICKS.flatMap((pick) => [
      pick.name,
      pick.origin.sv,
      pick.origin.en,
      pick.body.sv,
      pick.body.en,
    ]);
    const copy = beginnerPickCopy("sv");
    const en = beginnerPickCopy("en");
    strings.push(
      copy.heading,
      copy.intro,
      copy.moreBefore,
      copy.moreLink,
      copy.shopBefore,
      copy.shopLink,
      copy.shopMid,
      copy.boxLink,
      copy.shopAfter,
      en.heading,
      en.intro,
      en.moreBefore,
      en.moreLink,
      en.shopBefore,
      en.shopLink,
      en.shopMid,
      en.boxLink,
      en.shopAfter,
    );

    for (const value of strings) {
      expect(value).not.toMatch(/[—–]/);
    }
  });

  it("points more links at the live Systembolaget guide paths", () => {
    expect(beginnerPickCopy("sv").moreHref).toBe(
      "/guider/basta-naturvinerna-pa-systembolaget",
    );
    expect(beginnerPickCopy("en").moreHref).toBe(
      "/guides/best-natural-wines-systembolaget",
    );
  });

  it("links beginners into the PACT shop and natural wine box", () => {
    const sv = beginnerPickCopy("sv");
    const en = beginnerPickCopy("en");
    expect(sv.shopHref).toBe("/vin");
    expect(sv.boxHref).toBe("/vin/naturvin-lada");
    expect(en.shopHref).toBe("/wine");
    expect(en.boxHref).toBe("/wine/natural-wine-box");
  });

  it("SV and EN page routes both call the same renderWinesGuidePage", () => {
    const sv = readFileSync(
      "app/guider/varldens-basta-naturviner/page.tsx",
      "utf8",
    );
    const en = readFileSync(
      "app/guides/worlds-best-natural-wines/page.tsx",
      "utf8",
    );
    expect(sv).toContain('renderWinesGuidePage("sv")');
    expect(en).toContain('renderWinesGuidePage("en")');
    expect(sv).toContain("@/lib/guides/render-wines-guide");
    expect(en).toContain("@/lib/guides/render-wines-guide");
  });
});
