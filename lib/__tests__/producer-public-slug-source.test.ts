import { describe, expect, it } from "vitest";

import {
  resolveLiveProducerLinkForSlug,
  resolveProducerPublicHrefAgainstLive,
} from "@/lib/guides/guide-catalog-links";
import { GUIDE_SHOP_LINKS } from "@/lib/guides/shop-links";
import { top100ProducerShopLinkFromRow } from "@/lib/guides/top-100-producer-shop-links";
import {
  producerPublicHrefFromLegalName,
  producerPublicHrefFromSlug,
  producerPublicPath,
} from "@/lib/i18n/localized-routes";
import { producersFromProducts } from "@/lib/i18n/wine-region-page";
import {
  generateProducerSlug,
  producerProfileSlugFromLegalName,
} from "@/lib/producer-handle";
import type { Product } from "@/lib/shopify/types";

/**
 * Fixture mirrors prod: short display_name ≠ legal producers.name.
 * Public profile URLs must use the legal-name slug exclusively.
 */
const PRODUCERS = [
  {
    name: "Domaine Jean Foillard",
    display_name: "Jean Foillard",
    expectedSlug: "domaine-jean-foillard",
  },
  {
    name: "Domaine Romaneaux-Destezet",
    display_name: "Hervé Souhaut",
    expectedSlug: "domaine-romaneaux-destezet",
  },
  {
    name: "SAS Anne et Jean-François Ganevat",
    display_name: "Jean-François Ganevat",
    expectedSlug: "sas-anne-et-jean-francois-ganevat",
  },
] as const;

const EXISTING_SLUGS = new Set(
  PRODUCERS.map((producer) =>
    producerProfileSlugFromLegalName(producer.name),
  ),
);

function slugFromProducerHref(href: string): string | null {
  const match = href.match(/^\/(?:producers|producenter)\/([^/?#]+)\/?$/);
  return match?.[1] ?? null;
}

describe("producer public slug source", () => {
  it("slugifies legal name, not display_name (Foillard regression)", () => {
    const legal = "Domaine Jean Foillard";
    const display = "Jean Foillard";
    expect(generateProducerSlug(display)).toBe("jean-foillard");
    expect(producerProfileSlugFromLegalName(legal)).toBe(
      "domaine-jean-foillard",
    );
    expect(producerPublicHrefFromLegalName(legal, "sv")).toBe(
      "/producenter/domaine-jean-foillard",
    );
    expect(producerPublicHrefFromLegalName(legal, "en")).toBe(
      "/producers/domaine-jean-foillard",
    );
  });

  it("PDP fact-box href uses the legal-name slug, never the display label", () => {
    for (const producer of PRODUCERS) {
      const slug = producerProfileSlugFromLegalName(producer.name);
      expect(producerPublicHrefFromSlug(slug, "sv")).toBe(
        `/producenter/${producer.expectedSlug}`,
      );
      expect(producerPublicHrefFromSlug(slug, "en")).toBe(
        `/producers/${producer.expectedSlug}`,
      );
      // Bug: slugifying the shown display name would 404 on prod.
      expect(generateProducerSlug(producer.display_name)).not.toBe(
        producer.expectedSlug,
      );
    }
    expect(producerPublicHrefFromSlug(null, "sv")).toBeNull();
    expect(producerPublicHrefFromSlug("  ", "en")).toBeNull();
  });

  it("top-100 / region / shared href builders only emit existing legal-name slugs", () => {
    const hrefs: string[] = [];

    for (const producer of PRODUCERS) {
      hrefs.push(producerPublicHrefFromLegalName(producer.name, "sv"));
      hrefs.push(producerPublicHrefFromLegalName(producer.name, "en"));

      const top100 = top100ProducerShopLinkFromRow("sv", {
        name: producer.name,
        displayName: producer.display_name,
        hasLiveWine: true,
      });
      expect(top100).not.toBeNull();
      if (top100) hrefs.push(top100.href);

      const region = producersFromProducts(
        [
          {
            producerName: producer.name,
            producerDisplayName: producer.display_name,
            producerId: producer.expectedSlug,
          } as Product,
        ],
        "en",
      );
      expect(region).toHaveLength(1);
      hrefs.push(region[0]!.href);
    }

    for (const href of hrefs) {
      const slug = slugFromProducerHref(href);
      expect(slug, href).toBeTruthy();
      expect(EXISTING_SLUGS.has(slug!), href).toBe(true);
    }
  });

  it("hardcoded guide shop producer paths use legal-name slugs that exist", () => {
    const knownLegalSlugs = new Set([
      ...EXISTING_SLUGS,
      producerProfileSlugFromLegalName("Domaine Jean Foillard"),
      producerProfileSlugFromLegalName(
        "SAS Anne et Jean-François Ganevat",
      ),
    ]);
    const displayOnlyTrap = generateProducerSlug("Jean Foillard");

    const hrefs: string[] = [];
    for (const entry of Object.values(GUIDE_SHOP_LINKS)) {
      if (entry === "NONE") continue;
      for (const link of entry) {
        if (slugFromProducerHref(link.href)) hrefs.push(link.href);
      }
    }

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const slug = slugFromProducerHref(href);
      expect(slug, href).toBeTruthy();
      expect(slug, href).not.toBe(displayOnlyTrap);
      expect(knownLegalSlugs.has(slug!), href).toBe(true);
    }
  });

  it("producerPublicPath never receives a display-name-derived Foillard slug from helpers", () => {
    const legalSlug = producerProfileSlugFromLegalName(
      "Domaine Jean Foillard",
    );
    expect(producerPublicPath(legalSlug, "sv")).toBe(
      "/producenter/domaine-jean-foillard",
    );
    expect(producerPublicPath(legalSlug, "en")).toBe(
      "/producers/domaine-jean-foillard",
    );
  });

  it("rewrites SEO producer slugs onto the live legal-name slug when present", () => {
    const live = {
      "jean-foillard": {
        href: "/producenter/jean-foillard",
        label: "Jean Foillard",
      },
      "ugo-lestelle": {
        href: "/producers/ugo-lestelle",
        label: "Ugo Lestelle",
      },
    };

    expect(
      resolveLiveProducerLinkForSlug("domaine-jean-foillard", live)?.href,
    ).toBe("/producenter/jean-foillard");
    expect(
      resolveProducerPublicHrefAgainstLive(
        "/producers/domaine-jean-foillard",
        live,
      ),
    ).toBe("/producenter/jean-foillard");
    expect(
      resolveProducerPublicHrefAgainstLive("/producers/ugo-lestelle", live),
    ).toBe("/producers/ugo-lestelle");
    expect(
      resolveProducerPublicHrefAgainstLive("/producers/mas-des-mesures", live),
    ).toBeNull();
    expect(
      resolveProducerPublicHrefAgainstLive("/wine/orange-natural-wine", live),
    ).toBe("/wine/orange-natural-wine");
  });
});
