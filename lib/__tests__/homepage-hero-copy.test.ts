import { describe, expect, it } from "vitest";

import {
  homepageHeroCopyDefaults,
  isUnusableSwedishHeroValue,
} from "@/lib/homepage-hero-copy";

describe("homepageHeroCopyDefaults", () => {
  it("returns Swedish H1 lines without English middlemen tagline", () => {
    const sv = homepageHeroCopyDefaults("sv");
    expect(sv.title.toLowerCase()).toContain("vin utan");
    expect(sv.title.toLowerCase()).not.toContain("wine without");
    expect(sv.title.toLowerCase()).toContain("mellanhänder");
  });

  it("keeps the English middlemen tagline for EN", () => {
    const en = homepageHeroCopyDefaults("en");
    expect(en.title.toLowerCase()).toContain("wine without");
  });
});

describe("isUnusableSwedishHeroValue", () => {
  it("rejects blank Swedish values", () => {
    expect(isUnusableSwedishHeroValue("", "wine without")).toBe(true);
    expect(isUnusableSwedishHeroValue("  ", null)).toBe(true);
  });

  it("rejects Swedish values that merely copy the English CMS string", () => {
    expect(
      isUnusableSwedishHeroValue("wine without\nthe middlemen", "wine without\nthe middlemen"),
    ).toBe(true);
  });

  it("rejects known English hero phrases even if EN differs", () => {
    expect(
      isUnusableSwedishHeroValue("wine without the middlemen", "Something else"),
    ).toBe(true);
  });

  it("accepts real Swedish copy", () => {
    expect(
      isUnusableSwedishHeroValue("vin utan\nmellanhänder", "wine without\nthe middlemen"),
    ).toBe(false);
  });
});
