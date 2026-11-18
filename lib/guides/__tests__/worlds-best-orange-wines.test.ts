import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/guides/worlds-best-orange-wines",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { countryLabel, regionLabel } from "@/lib/guides/guide-labels";
import {
  buildWorldsBestOrangeWinesMetadata,
  getOrangeWinesFromTop100,
  renderWorldsBestOrangeWinesPage,
} from "@/lib/guides/render-worlds-best-orange-wines";
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";
import {
  ORANGE_WINE_EN_BLURBS,
  worldsBestOrangeWinesGuide,
} from "@/lib/guides/worlds-best-orange-wines";

const SWEDISH_COUNTRY_TOKENS = [
  "Frankrike",
  "Italien",
  "Georgien",
  "Slovenien",
  "Spanien",
  "Tyskland",
  "Österrike",
  "Sicilien",
];

describe("English orange wines guide", () => {
  it("uses the absolute English title, H1 and hub description", async () => {
    const metadata = await buildWorldsBestOrangeWinesMetadata("en");
    expect(metadata.title).toEqual({
      absolute:
        "The Best Orange Wines in the World: 11 Skin-Contact Wines to Know",
    });
    expect(metadata.description).toBe(
      "The world's best orange wines, from Gravner and Radikon in Friuli to qvevri wines from Georgia. How each one is made, what it tastes like, and where to start.",
    );
    expect(worldsBestOrangeWinesGuide.h1.en).toBe(
      "The world's best orange wines",
    );
    expect(worldsBestOrangeWinesGuide.hubCard.description.en).toBe(
      "Eleven orange wines that define the style, from Friuli and Slovenia to Georgia and Alsace.",
    );
    expect(worldsBestOrangeWinesGuide.updated).toBe("2026-11-18");
    expect(metadata.alternates?.canonical).toBe(
      "https://pactwines.com/guides/worlds-best-orange-wines",
    );
  });

  it("renders eleven wines, two sections and six FAQs, without the Languedoc link", async () => {
    const html = renderToStaticMarkup(
      await renderWorldsBestOrangeWinesPage("en"),
    );
    const text = html.replace(/&#x27;/g, "'");
    const wines = getOrangeWinesFromTop100();
    expect(wines).toHaveLength(11);
    expect(html).toContain("How we chose");
    expect(html).toContain("The list");
    expect(html).toContain("Where the best orange wines come from");
    expect(html).toContain("Where to start");
    expect(html).toContain("Frequently asked questions");
    expect(html).not.toContain("Languedoc");
    expect(html).not.toContain("independently arrived");
    expect(html).not.toContain("/wine/orange-natural-wine");

    for (const [index, wine] of wines.entries()) {
      expect(text).toContain(`${index + 1}. ${wine.producer}, ${wine.wine}`);
      expect(ORANGE_WINE_EN_BLURBS[wine.rank]?.body.length).toBeGreaterThan(40);
    }

    const itemList = html.match(
      /"@type":"ItemList".*?"itemListElement":(\[.*?\])/,
    );
    expect(itemList?.[1]).toBe(
      JSON.stringify(
        wines.map((wine, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: wine.wine,
        })),
      ),
    );

    for (const faq of worldsBestOrangeWinesGuide.faqs) {
      expect(html).toContain(faq.question);
      expect(html).toContain(faq.answer);
    }
    expect(html).toContain('"@type":"FAQPage"');

    for (const link of worldsBestOrangeWinesGuide.furtherReading) {
      expect(text).toContain(link.label);
      expect(html).toContain(link.href);
    }

    for (const token of SWEDISH_COUNTRY_TOKENS) {
      expect(html).not.toContain(token);
    }
  });

  it("keeps the Swedish page on the table and the previous copy", async () => {
    const html = renderToStaticMarkup(
      await renderWorldsBestOrangeWinesPage("sv"),
    );
    expect(html).toContain("Världens bästa orange viner");
    expect(html).toContain("Joško Gravner återvände från Georgien");
    expect(html).toContain("Kakheti, Georgien");
    expect(html).toContain("Utforska orange naturvin");
    expect(html).not.toContain("How we chose");
    expect(html).not.toContain("FAQPage");
    expect(html).not.toContain("Languedoc");
    expect(worldsBestOrangeWinesGuide.metaTitle.sv).toBe(
      "Världens bästa orange viner — en kurerad lista",
    );
  });
});

describe("TOP_100_WINES English place names", () => {
  it("translates country names inside region strings on English pages only", () => {
    expect(regionLabel("Kakheti, Georgien", "en")).toBe("Kakheti, Georgia");
    expect(regionLabel("Nakhshirgele, Imereti, Georgien", "en")).toBe(
      "Nakhshirgele, Imereti, Georgia",
    );
    expect(regionLabel("Brda, Slovenien", "en")).toBe("Brda, Slovenia");
    expect(regionLabel("Pantelleria, Sicilien", "en")).toBe(
      "Pantelleria, Sicily",
    );
    expect(regionLabel("Mosel, Tyskland", "en")).toBe("Mosel, Germany");
    expect(regionLabel("Kakheti, Georgien", "sv")).toBe("Kakheti, Georgien");
    expect(countryLabel("Italien", "en")).toBe("Italy");
    expect(countryLabel("Italien", "sv")).toBe("Italien");

    for (const wine of TOP_100_WINES) {
      const region = regionLabel(wine.region, "en");
      for (const token of SWEDISH_COUNTRY_TOKENS) {
        const parts = region.split(",").map((part) => part.trim());
        expect(parts).not.toContain(token);
      }
    }
  });
});

describe("TOP_100_WINES orange description corrections", () => {
  it("corrects Gravner, Radikon and Pheasant's Tears in both languages", () => {
    const gravner = TOP_100_WINES.find((wine) => wine.rank === 3);
    expect(gravner?.description).toContain(
      "Efter en resa till Georgien 2000 började Gravner jäsa i qvevri nedgrävda i källaren från 2001 års skörd.",
    );
    expect(gravner?.description).not.toContain("1997");
    expect(gravner?.descriptionEn).toContain(
      "After a trip to Georgia in 2000, Gravner began fermenting in qvevri buried in the cellar from the 2001 vintage.",
    );
    expect(gravner?.descriptionEn).not.toContain("1997");
    expect(gravner?.descriptionEn).toContain(
      "Ribolla Gialla gets months of skin contact",
    );

    const radikon = TOP_100_WINES.find((wine) => wine.rank === 28);
    expect(radikon?.descriptionEn).toContain(
      "made the village of Oslavia known for skin-contact white wine",
    );
    expect(radikon?.descriptionEn).not.toContain("capital of orange wine");
    expect(radikon?.description).toContain(
      "gjorde byn Oslavia känd för skalmacererat vitt vin",
    );
    expect(radikon?.description).not.toContain("orangevinets huvudstad");

    const pheasant = TOP_100_WINES.find((wine) => wine.rank === 6);
    expect(pheasant?.descriptionEn).toContain(
      "vinified in the traditional Kakhetian way",
    );
    expect(pheasant?.descriptionEn).not.toContain("eight thousand years");
    expect(pheasant?.description).toContain("på traditionellt kakhetiskt vis");
    expect(pheasant?.description).not.toContain("åtta tusen år");
  });
});
