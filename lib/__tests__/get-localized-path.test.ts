import { describe, expect, it } from "vitest";

import {
  getLocalizedPath,
  switchProducerBoxesPath,
} from "@/lib/i18n/get-localized-path";
import { PRODUCER_BOXES_PATH } from "@/lib/producer-boxes/config";
import {
  SHOP_FILTER_COLORS,
  SHOP_FILTER_FARMING,
} from "@/lib/wine-shop-filter-categories";
import { WINE_REGIONS, wineRegionPagePath } from "@/lib/wine-regions";

function comboSlug(
  colorShortEn: string,
  farmingShortEn: string,
  colorSvSlug: string,
  farmingSvSlug: string,
  locale: "sv" | "en",
): string {
  if (locale === "en") return `${colorShortEn}-${farmingShortEn}-wine`;
  const colorPart = colorSvSlug.replace(/-vin$/, "");
  return `${colorPart}-${farmingSvSlug}`;
}

describe("switchProducerBoxesPath", () => {
  it("maps the natural wine box between SV and EN slugs", () => {
    expect(switchProducerBoxesPath(PRODUCER_BOXES_PATH.sv, "en")).toBe(
      PRODUCER_BOXES_PATH.en,
    );
    expect(switchProducerBoxesPath(PRODUCER_BOXES_PATH.en, "sv")).toBe(
      PRODUCER_BOXES_PATH.sv,
    );
    expect(switchProducerBoxesPath("/vin/rott-naturvin", "en")).toBeNull();
  });
});

describe("getLocalizedPath — differing SV/EN category slugs", () => {
  it("maps the producer boxes landing (not a prefix swap)", () => {
    expect(getLocalizedPath("/vin/naturvin-lada", "en")).toBe(
      "/wine/natural-wine-box",
    );
    expect(getLocalizedPath("/wine/natural-wine-box", "sv")).toBe(
      "/vin/naturvin-lada",
    );
    expect(getLocalizedPath("/vin/naturvin-lada", "en")).not.toBe(
      "/wine/naturvin-lada",
    );
    expect(getLocalizedPath("/wine/natural-wine-box", "sv")).not.toBe(
      "/vin/natural-wine-box",
    );
  });

  it("maps every colour hub slug pair", () => {
    for (const color of SHOP_FILTER_COLORS) {
      expect(getLocalizedPath(`/vin/${color.sv.slug}`, "en")).toBe(
        `/wine/${color.en.slug}`,
      );
      expect(getLocalizedPath(`/wine/${color.en.slug}`, "sv")).toBe(
        `/vin/${color.sv.slug}`,
      );
    }
  });

  it("maps every farming hub slug pair", () => {
    for (const farming of SHOP_FILTER_FARMING) {
      expect(getLocalizedPath(`/vin/${farming.sv.slug}`, "en")).toBe(
        `/wine/${farming.en.slug}`,
      );
      expect(getLocalizedPath(`/wine/${farming.en.slug}`, "sv")).toBe(
        `/vin/${farming.sv.slug}`,
      );
    }
  });

  it("maps every colour × farming combo slug pair", () => {
    for (const color of SHOP_FILTER_COLORS) {
      for (const farming of SHOP_FILTER_FARMING) {
        const sv = comboSlug(
          color.en.short,
          farming.en.short,
          color.sv.slug,
          farming.sv.slug,
          "sv",
        );
        const en = comboSlug(
          color.en.short,
          farming.en.short,
          color.sv.slug,
          farming.sv.slug,
          "en",
        );
        expect(getLocalizedPath(`/vin/${sv}`, "en")).toBe(`/wine/${en}`);
        expect(getLocalizedPath(`/wine/${en}`, "sv")).toBe(`/vin/${sv}`);
      }
    }
  });

  it("maps every region shop slug pair", () => {
    for (const region of WINE_REGIONS) {
      const sv = wineRegionPagePath(region.slug, "sv");
      const en = wineRegionPagePath(region.slug, "en");
      expect(getLocalizedPath(sv, "en")).toBe(en);
      expect(getLocalizedPath(en, "sv")).toBe(sv);
    }
  });

  it("maps shop roots", () => {
    expect(getLocalizedPath("/vin", "en")).toBe("/wine");
    expect(getLocalizedPath("/wine", "sv")).toBe("/vin");
  });
});
