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
      en.heading,
      en.intro,
      en.moreBefore,
      en.moreLink,
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
});
