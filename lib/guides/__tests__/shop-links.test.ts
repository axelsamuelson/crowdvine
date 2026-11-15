import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

import {
  GUIDE_SHOP_LINKS,
  GUIDE_SHOP_LINKS_LEAD,
  GUIDE_SHOP_LINKS_MAX,
  GUIDE_SHOP_LINK_NOINDEX_TARGETS,
  getGuideShopLinks,
  guideShopLinkLocale,
  isGuideShopLinkNoindexTarget,
  isSystembolagetGuideSlug,
  shouldShowGuideShopCta,
  type GuideShopLink,
} from "@/lib/guides/shop-links";

function configuredLinkEntries(): Array<{
  path: string;
  links: readonly GuideShopLink[];
}> {
  return Object.entries(GUIDE_SHOP_LINKS).flatMap(([path, entry]) =>
    entry === "NONE" ? [] : [{ path, links: entry }],
  );
}

describe("guide shop links config", () => {
  it("keeps every link in the matching locale path prefix", () => {
    for (const { path, links } of configuredLinkEntries()) {
      const expectedLocale = path.startsWith("/guider") ? "sv" : "en";
      for (const link of links) {
        expect(
          guideShopLinkLocale(link.href),
          `${path} → ${link.href}`,
        ).toBe(expectedLocale);
      }
    }
  });

  it("allows at most 3 links per guide", () => {
    for (const { path, links } of configuredLinkEntries()) {
      expect(links.length, path).toBeLessThanOrEqual(GUIDE_SHOP_LINKS_MAX);
      expect(links.length, path).toBeGreaterThan(0);
    }
  });

  it("never targets noindex shop paths or banned category slugs", () => {
    for (const target of GUIDE_SHOP_LINK_NOINDEX_TARGETS) {
      expect(isGuideShopLinkNoindexTarget(target)).toBe(true);
    }
    expect(isGuideShopLinkNoindexTarget("/wine/pet-nat")).toBe(true);
    expect(isGuideShopLinkNoindexTarget("/vin/mousserande-naturvin")).toBe(
      true,
    );
    expect(isGuideShopLinkNoindexTarget("/wine/rose-natural-wine")).toBe(true);
    expect(isGuideShopLinkNoindexTarget("/vin/glouglou")).toBe(true);
    expect(isGuideShopLinkNoindexTarget("/wine/georgia-natural-wine")).toBe(
      true,
    );

    for (const { path, links } of configuredLinkEntries()) {
      for (const link of links) {
        expect(
          isGuideShopLinkNoindexTarget(link.href),
          `${path} → ${link.href}`,
        ).toBe(false);
      }
    }
  });

  it("returns null for NONE guides and resolves hub links", () => {
    expect(getGuideShopLinks("/guides/thierry-allemand")).toBeNull();
    expect(getGuideShopLinks("/guider/radikon")).toBeNull();
    expect(getGuideShopLinks("/guides")).toEqual([
      { href: "/wine", anchor: "natural wine" },
      { href: "/wine/orange-natural-wine", anchor: "orange wine" },
      {
        href: "/wine/languedoc-natural-wine",
        anchor: "natural wine from the Languedoc",
      },
    ]);
  });

  it("uses CMO final lead-in copy without buying prompts", () => {
    expect(GUIDE_SHOP_LINKS_LEAD.sv).toBe(
      "Vi säljer naturvin från Frankrike på delade pallar, med leverans inom Sverige.",
    );
    expect(GUIDE_SHOP_LINKS_LEAD.en).toBe(
      "PACT sells natural wine from France on shared pallets, delivered within Sweden.",
    );
    const banned = /\b(köp|shoppa|buy|shop)\b/i;
    expect(GUIDE_SHOP_LINKS_LEAD.sv).not.toMatch(banned);
    expect(GUIDE_SHOP_LINKS_LEAD.en).not.toMatch(banned);
    for (const { links } of configuredLinkEntries()) {
      for (const link of links) {
        expect(link.anchor).not.toMatch(/→/);
        expect(link.anchor).not.toMatch(banned);
      }
    }
  });
});

describe("Systembolaget shop CTA hide", () => {
  it("hides the existing shop CTA on every -systembolaget slug", () => {
    expect(isSystembolagetGuideSlug("best-red-natural-wines-systembolaget")).toBe(
      true,
    );
    expect(
      isSystembolagetGuideSlug("basta-roda-naturviner-systembolaget"),
    ).toBe(true);
    expect(shouldShowGuideShopCta("best-red-natural-wines-systembolaget")).toBe(
      false,
    );
    expect(
      shouldShowGuideShopCta("basta-roda-naturviner-systembolaget"),
    ).toBe(false);
    expect(shouldShowGuideShopCta("vad-ar-naturvin")).toBe(true);
    expect(shouldShowGuideShopCta("jean-foillard")).toBe(true);
  });

  it("wires shouldShowGuideShopCta into the article guide renderer", () => {
    const src = readFileSync(
      resolve(process.cwd(), "lib/guides/render-article-guide.tsx"),
      "utf8",
    );
    expect(src).toMatch(/shouldShowGuideShopCta/);
    expect(src).toMatch(
      /if\s*\(\s*!shouldShowGuideShopCta\(content\.slug\[locale\]\)\s*\)\s*return\s*null/,
    );
  });

  it("merges the existing shop CTA into GuideShopLinksBlock (one section, no sibling CTA)", () => {
    const renderer = readFileSync(
      resolve(process.cwd(), "lib/guides/render-article-guide.tsx"),
      "utf8",
    );
    const block = readFileSync(
      resolve(process.cwd(), "components/guides/guide-shop-links-block.tsx"),
      "utf8",
    );
    expect(renderer).toMatch(/cta=\{shopCtaProps\}/);
    expect(renderer).not.toMatch(
      /afterSections=\{[\s\S]*GuideShopLinksBlock[\s\S]*ArticleShopCta/,
    );
    expect(block).toMatch(/data-guide-shop-cta/);
    expect(block).toMatch(/cta\?:/);
    // Single top divider on the aside; CTA is nested without its own border-t.
    expect(block).toMatch(/border-t border-border pt-6/);
    const ctaChunk = block.slice(block.indexOf("{cta ?"));
    expect(ctaChunk).not.toMatch(/border-t/);
  });
});
