import { describe, expect, it } from "vitest";

import { jeanPaulThevenetArticle } from "@/lib/guides/articles/jean-paul-thevenet";
import { whatIsNaturalWineArticle } from "@/lib/guides/articles/what-is-natural-wine";
import { whatIsOrangeWineArticle } from "@/lib/guides/articles/what-is-orange-wine";
import {
  articleGuideCrumbs,
  articleGuideJsonLdItems,
} from "@/lib/guides/guide-article-crumbs";
import { guideCopy } from "@/lib/guides/guide-copy";
import {
  ALL_PRODUCER_GUIDES,
  producerGuideHref,
  splitProducerBlurbMentions,
} from "@/lib/guides/producer-guide-links";
import type { AppLocale } from "@/lib/i18n/locale";

const BASE = "https://pactwines.com";

function trail(locale: AppLocale, slug: string, pageLabel: string) {
  const copy = guideCopy(locale);
  const crumbs = articleGuideCrumbs({
    locale,
    homeLabel: copy.home,
    hubLabel: copy.hubTitle,
    hubPath: locale === "sv" ? "/guider" : "/guides",
    pageLabel,
    slug,
  });
  const jsonLd = articleGuideJsonLdItems(crumbs, BASE);
  return { crumbs, jsonLd };
}

describe("producer guide links", () => {
  it("points each ranked producer at the locale path and keeps 11 guides", () => {
    expect(ALL_PRODUCER_GUIDES).toHaveLength(11);
    expect(producerGuideHref(1, "sv")).toBe("/guider/pierre-overnoy");
    expect(producerGuideHref(1, "en")).toBe("/guides/pierre-overnoy");
    expect(producerGuideHref(29, "sv")).toBe("/guider/guy-breton");
    expect(producerGuideHref(6, "en")).toBeUndefined();
    expect(ALL_PRODUCER_GUIDES.map((guide) => guide.slug)).toEqual([
      "pierre-overnoy",
      "thierry-allemand",
      "josko-gravner",
      "jean-francois-ganevat",
      "jacques-selosse",
      "radikon",
      "jean-foillard",
      "marcel-lapierre",
      "guy-breton",
      "jean-paul-thevenet",
      "gang-of-four-wine",
    ]);
    for (const guide of ALL_PRODUCER_GUIDES) {
      expect(guide.name.en.trim().length).toBeGreaterThan(0);
      expect(guide.name.sv.trim().length).toBeGreaterThan(0);
      expect(guide.name.en).not.toMatch(/[åäöÅÄÖ]/);
      expect(guide.name.en).not.toContain("—");
      expect(guide.name.sv).not.toContain("—");
    }
  });

  it("links Thévenet and Gang of Four mentions without changing the words", () => {
    const text =
      'with Lapierre, Thévenet and Breton. Known as the Gang of Four.';
    expect(splitProducerBlurbMentions(text, "sv")).toEqual([
      { text: "with Lapierre, " },
      { text: "Thévenet", href: "/guider/jean-paul-thevenet" },
      { text: " and Breton. Known as the " },
      { text: "Gang of Four", href: "/guider/gang-of-four-wine" },
      { text: "." },
    ]);
    expect(splitProducerBlurbMentions(text, "en")[1]?.href).toBe(
      "/guides/jean-paul-thevenet",
    );
  });
});

describe("article breadcrumbs", () => {
  it("puts producer guides under the producers list, except Gang of Four", () => {
    const sv = trail("sv", "pierre-overnoy", "Pierre Overnoy");
    expect(sv.crumbs.map((crumb) => crumb.label)).toEqual([
      "Hem",
      "Guider",
      "Världens bästa naturvinsproducenter",
      "Pierre Overnoy",
    ]);
    expect(sv.crumbs[2]?.href).toBe(
      "/guider/varldens-basta-naturvinsproducenter",
    );
    expect(sv.crumbs[3]?.href).toBeUndefined();
    expect(sv.jsonLd.map((item) => item.name)).toEqual(
      sv.crumbs.map((crumb) => crumb.label),
    );
    expect(sv.jsonLd[2]?.item).toBe(
      `${BASE}/guider/varldens-basta-naturvinsproducenter`,
    );
    expect(sv.jsonLd[3]?.item).toBeUndefined();

    const en = trail("en", "jean-francois-ganevat", "Jean-François Ganevat");
    expect(en.crumbs.map((crumb) => crumb.label)).toEqual([
      "Home",
      "Natural Wine Guides",
      "World's best natural wine producers",
      "Jean-François Ganevat",
    ]);
    expect(en.crumbs[2]?.href).toBe(
      "/guides/worlds-best-natural-wine-producers",
    );
    expect(en.jsonLd[2]?.item).toBe(
      `${BASE}/guides/worlds-best-natural-wine-producers`,
    );

    const gang = trail("en", "gang-of-four-wine", "The Gang of Four");
    expect(gang.crumbs).toHaveLength(3);
    expect(gang.jsonLd).toHaveLength(3);
  });

  it("puts the style children under the natural wine explainer", () => {
    const sv = trail("sv", "what-is-red-natural-wine", "Vad är rött naturvin?");
    expect(sv.crumbs.map((crumb) => crumb.label)).toEqual([
      "Hem",
      "Guider",
      "Vad är naturvin?",
      "Vad är rött naturvin?",
    ]);
    expect(sv.crumbs[2]?.href).toBe("/guider/vad-ar-naturvin");
    expect(sv.jsonLd[2]?.item).toBe(`${BASE}/guider/vad-ar-naturvin`);
    expect(sv.jsonLd[3]?.item).toBeUndefined();

    const en = trail("en", "what-is-orange-wine", "What is orange wine?");
    expect(en.crumbs[2]).toEqual({
      label: "What is natural wine?",
      href: "/guides/what-is-natural-wine",
    });

    const parent = trail("sv", "what-is-natural-wine", "Vad är naturvin?");
    expect(parent.crumbs).toHaveLength(3);
  });

  it("leaves region and Systembolaget lists on the three-item trail", () => {
    expect(trail("sv", "jura-natural-wine", "Jura naturvin").crumbs).toHaveLength(
      3,
    );
    expect(
      trail("en", "best-red-natural-wines-systembolaget", "Best red").crumbs,
    ).toHaveLength(3);
  });
});

describe("style and Thévenet links", () => {
  it("links the style explainers from the taste section", () => {
    const section = whatIsNaturalWineArticle.sections.find(
      (item) => item.heading?.en === "What natural wine tastes like",
    );
    const en = Array.isArray(section?.body.en)
      ? section.body.en.join("\n")
      : (section?.body.en ?? "");
    const sv = Array.isArray(section?.body.sv)
      ? section.body.sv.join("\n")
      : (section?.body.sv ?? "");
    expect(en).toContain("[Red natural wine](/guides/what-is-red-natural-wine)");
    expect(en).toContain(
      "[White natural wine](/guides/what-is-white-natural-wine)",
    );
    expect(en).toContain("[Orange wine](/guides/what-is-orange-wine)");
    expect(en).toContain(
      "[sparkling natural wine](/guides/best-sparkling-natural-wines-systembolaget)",
    );
    expect(sv).toContain("[Rött naturvin](/guider/vad-ar-rott-naturvin)");
    expect(sv).toContain("[Vitt naturvin](/guider/vad-ar-vitt-naturvin)");
    expect(sv).toContain("[Orange vin](/guider/vad-ar-orange-vin)");
    expect(sv).toContain(
      "[mousserande naturvin](/guider/basta-mousserande-naturviner-systembolaget)",
    );
    expect(section?.heading?.en).not.toMatch(/[åäöÅÄÖ]/);
    expect(JSON.stringify(section?.heading)).not.toContain("—");

    const back = whatIsOrangeWineArticle.internalLinks.at(-1);
    expect(back?.label).toEqual({
      en: "What is natural wine?",
      sv: "Vad är naturvin?",
    });
    expect(back?.href).toEqual({
      en: "/guides/what-is-natural-wine",
      sv: "/guider/vad-ar-naturvin",
    });
  });

  it("gives the Swedish Thévenet producers link a label", () => {
    const link = jeanPaulThevenetArticle.internalLinks.find(
      (item) => item.href.en === "/guides/worlds-best-natural-wine-producers",
    );
    expect(link?.label.sv).toBe(
      "Utforska världens 100 bästa naturvinsproducenter →",
    );
    expect(link?.label.en.trim().length).toBeGreaterThan(0);
    expect(link?.label.sv.trim().length).toBeGreaterThan(0);
  });
});
