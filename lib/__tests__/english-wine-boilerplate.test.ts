import { describe, expect, it } from "vitest";

import {
  extractStorefrontWineText,
  isEnglishWineDescriptionBoilerplate,
} from "@/lib/i18n/wine-locale";

describe("English wine description boilerplate", () => {
  const boilerplate =
    "This exceptional Red wine from 2022 showcases the unique characteristics of Carignan. Crafted with precision and passion, this wine offers a perfect balance of flavors and aromas that will delight your palate.";

  it("detects the shared EN filler sentence", () => {
    expect(isEnglishWineDescriptionBoilerplate(boilerplate)).toBe(true);
    expect(isEnglishWineDescriptionBoilerplate("Real tasting note.")).toBe(
      false,
    );
  });

  it("does not fall back to Swedish on EN storefronts", () => {
    expect(
      extractStorefrontWineText({ sv: "Svensk text", en: "" }, "en"),
    ).toBeNull();
    expect(
      extractStorefrontWineText({ sv: "Svensk text" }, "en"),
    ).toBeNull();
    expect(
      extractStorefrontWineText({ sv: "Svensk text", en: "English note" }, "en"),
    ).toBe("English note");
  });

  it("treats stored boilerplate as empty", () => {
    expect(extractStorefrontWineText(boilerplate, "en")).toBeNull();
    expect(
      extractStorefrontWineText({ en: boilerplate, sv: "Riktig text" }, "en"),
    ).toBeNull();
    expect(
      extractStorefrontWineText({ en: boilerplate, sv: "Riktig text" }, "sv"),
    ).toBe("Riktig text");
  });
});
