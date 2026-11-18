import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/guides/worlds-best-orange-wines",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { countryLabel, regionLabel } from "@/lib/guides/guide-labels";
import { georgiaNaturalWineArticle } from "@/lib/guides/articles/georgia-natural-wine";
import { joskoGravnerArticle } from "@/lib/guides/articles/josko-gravner";
import {
  buildWorldsBestOrangeWinesMetadata,
  getOrangeWinesFromTop100,
  renderWorldsBestOrangeWinesPage,
} from "@/lib/guides/render-worlds-best-orange-wines";
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
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

describe("Gravner Georgia trip year", () => {
  it("dates the trip to 2000 and qvevri to the 2001 vintage", () => {
    expect(joskoGravnerArticle.meta.en).toContain("In 2000 Joško Gravner visited Georgia");
    expect(joskoGravnerArticle.meta.en).toContain("qvevri from the 2001 vintage");
    expect(joskoGravnerArticle.meta.sv).toContain("2000 reste Joško Gravner till Georgien");
    expect(joskoGravnerArticle.meta.sv).toContain("Från 2001 års skörd använde han qvevri");
    const gravnerEn = joskoGravnerArticle.sections
      .flatMap((section) =>
        Array.isArray(section.body.en) ? section.body.en : [section.body.en],
      )
      .join("\n");
    const gravnerSv = joskoGravnerArticle.sections
      .map((section) => section.body.sv)
      .join("\n");
    expect(gravnerEn).toContain("Then came 2000, and a trip to Georgia");
    expect(gravnerEn).toContain("From the 2001 vintage he used qvevri");
    expect(gravnerEn).not.toContain("1997");
    expect(gravnerSv).toContain("2000 reste han till Georgien");
    expect(gravnerSv).toContain("Från 2001 års skörd använde han qvevri");
    expect(gravnerSv).not.toContain("1997");

    const georgiaEn = georgiaNaturalWineArticle.sections
      .flatMap((section) =>
        Array.isArray(section.body.en) ? section.body.en : [section.body.en],
      )
      .join("\n");
    const georgiaSv = georgiaNaturalWineArticle.sections
      .map((section) => section.body.sv)
      .join("\n");
    expect(georgiaEn).toContain("Joško Gravner's 2000 trip to Georgia");
    expect(georgiaEn).toContain("He used qvevri from the 2001 vintage");
    expect(georgiaEn).not.toContain("1997");
    expect(georgiaSv).toContain("Gravners resa 2000");
    expect(georgiaSv).toContain("Från 2001 års skörd använde han qvevri");
    expect(georgiaSv).not.toContain("1997");
  });
});

describe("English producer region names", () => {
  it("translates Swedish country tokens and leaves the Swedish page unchanged", () => {
    const changed = [
      ...new Set(
        TOP_100_PRODUCERS.map((producer) => producer.region).filter(
          (region) => regionLabel(region, "en") !== region,
        ),
      ),
    ].sort();
    expect(changed.map((region) => [region, regionLabel(region, "en")])).toEqual(
      [
        ["Brda, Slovenien", "Brda, Slovenia"],
        ["Etna Nord, Sicilien", "Etna Nord, Sicily"],
        [
          "Galicien, Kanarieöarna & Bierzo, Spanien",
          "Galicia, Canary Islands & Bierzo, Spain",
        ],
        ["Imereti, Georgien", "Imereti, Georgia"],
        ["Kakheti, Georgien", "Kakheti, Georgia"],
        ["Kvemo Kartli, Georgien", "Kvemo Kartli, Georgia"],
        [
          "McLaren Vale / Basket Range, Australien",
          "McLaren Vale / Basket Range, Australia",
        ],
        ["North Coast, Kalifornien", "North Coast, California"],
        ["Pantelleria, Sicilien", "Pantelleria, Sicily"],
        ["Swartland, Sydafrika", "Swartland, South Africa"],
        ["Südsteiermark, Österrike", "Südsteiermark, Austria"],
        ["Terra Alta, Katalonien", "Terra Alta, Catalonia"],
        ["Vittoria, Sicilien", "Vittoria, Sicily"],
        ["Weststeiermark, Österrike", "Weststeiermark, Austria"],
      ],
    );
    for (const producer of TOP_100_PRODUCERS) {
      expect(regionLabel(producer.region, "sv")).toBe(producer.region);
    }

    const gravner = TOP_100_PRODUCERS.find((producer) => producer.name === "Joško Gravner");
    expect(gravner?.region).toBe("Oslavia, Collio, Friuli");
    expect(gravner?.descriptionEn).toContain("until a 2000 trip to Georgia");
    expect(gravner?.descriptionEn).toContain("From 2001 he has vinified in qvevri");
    expect(gravner?.descriptionEn).not.toContain("1997");
    expect(gravner?.description).toContain("2000 gjorde en resa till Georgien");
    expect(gravner?.description).toContain("Från 2001 vinifierar han i qvevri");
    expect(gravner?.description).not.toContain("1997");

    const wineChanges = [
      ...new Set(
        TOP_100_WINES.map((wine) => wine.region).filter(
          (region) => regionLabel(region, "en") !== region,
        ),
      ),
    ].sort();
    expect(
      wineChanges.map((region) => [region, regionLabel(region, "en")]),
    ).toEqual([
      ["Amandi, Ribeira Sacra, Galicien", "Amandi, Ribeira Sacra, Galicia"],
      ["Brda, Slovenien", "Brda, Slovenia"],
      ["Burgenland, Österrike", "Burgenland, Austria"],
      [
        "Contrada Barbabecchi, Etna Nord, Sicilien",
        "Contrada Barbabecchi, Etna Nord, Sicily",
      ],
      ["Etna, Sicilien", "Etna, Sicily"],
      ["Kakheti, Georgien", "Kakheti, Georgia"],
      ["Kartli, Georgien", "Kartli, Georgia"],
      ["Mosel, Tyskland", "Mosel, Germany"],
      [
        "Nakhshirgele, Imereti, Georgien",
        "Nakhshirgele, Imereti, Georgia",
      ],
      ["Oggau, Burgenland, Österrike", "Oggau, Burgenland, Austria"],
      ["Pantelleria, Sicilien", "Pantelleria, Sicily"],
      ["Südsteiermark, Österrike", "Südsteiermark, Austria"],
      [
        "Valle de La Orotava, Tenerife, Kanarieöarna",
        "Valle de La Orotava, Tenerife, Canary Islands",
      ],
      ["Weststeiermark, Österrike", "Weststeiermark, Austria"],
    ]);
  });
});
