import { describe, expect, it } from "vitest";

import { buildProducerWineryJsonLd } from "@/lib/seo/producer-json-ld";
import {
  instagramProfileUrl,
  normalizeInstagramHandle,
  parseProducerLinkFields,
  websiteDisplayLabel,
} from "@/lib/producer-links";

const producer = {
  name: "Mas des Mesures",
  region: "Languedoc",
  subregion: null,
  country: "FR",
  founded_year: null,
  bio_short: null,
  pageUrl: "https://pactwines.com/producers/mas-des-mesures",
};

describe("producer links", () => {
  it("turns a blank website into null and keeps an http(s) url", () => {
    const blank = parseProducerLinkFields({ website_url: "  " });
    const site = parseProducerLinkFields({
      website_url: " https://masdesmesures.fr/en ",
    });
    const rejected = parseProducerLinkFields({ website_url: "ftp://example.com" });

    expect(blank.ok && blank.links.website_url).toBe(null);
    expect(site.ok && site.links.website_url).toBe(
      "https://masdesmesures.fr/en",
    );
    expect(rejected.ok).toBe(false);
  });

  it("normalizes an Instagram handle from @, case, and a profile URL", () => {
    expect(normalizeInstagramHandle("  @MasDes.Mesures ")).toBe(
      "masdes.mesures",
    );
    expect(
      normalizeInstagramHandle(
        "https://www.instagram.com/MasDes.Mesures/?hl=en",
      ),
    ).toBe("masdes.mesures");
    expect(normalizeInstagramHandle("")).toBe(null);

    const parsed = parseProducerLinkFields({
      instagram_handle: "https://instagram.com/masdes.mesures/",
    });
    expect(parsed.ok && parsed.links.instagram_handle).toBe("masdes.mesures");
  });

  it("leaves verification unset unless the button flag is true", () => {
    const changed = parseProducerLinkFields({
      website_url: "https://masdesmesures.fr",
      instagram_handle: "@new.handle",
    });
    const marked = parseProducerLinkFields({
      website_url: "https://masdesmesures.fr",
      mark_links_verified: true,
    });

    expect(changed.ok && changed.links.mark_links_verified).toBe(false);
    expect(marked.ok && marked.links.mark_links_verified).toBe(true);
  });

  it("shows the domain without protocol or www", () => {
    expect(websiteDisplayLabel("https://www.masdesmesures.fr/en")).toBe(
      "masdesmesures.fr",
    );
    expect(instagramProfileUrl("masdes.mesures")).toBe(
      "https://www.instagram.com/masdes.mesures/",
    );
  });

  it("adds website and Instagram to existing winery JSON-LD sameAs", () => {
    const withLinks = buildProducerWineryJsonLd(
      {
        ...producer,
        website_url: "https://www.masdesmesures.fr",
        instagram_handle: "masdes.mesures",
      },
      [],
      "product",
    );
    const withoutLinks = buildProducerWineryJsonLd(producer, [], "product");

    expect(withLinks.sameAs).toEqual([
      "https://www.masdesmesures.fr",
      "https://www.instagram.com/masdes.mesures/",
    ]);
    expect(withoutLinks).not.toHaveProperty("sameAs");
  });
});
