import { describe, expect, it } from "vitest";
import {
  extractWinePlaceSlugFromLoc,
  isDateOnlySitemapLastmod,
  parseSitemapIndexLocs,
  parseSitemapLastmod,
  parseSitemapUrlEntries,
  shouldBoostFromSitemapLastmod,
  toWinePlaceEntries,
} from "../sitemap-discovery";

const SAMPLE_URLSET = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://starwinelist.com/wine-place/brasserie-elverket</loc>
    <lastmod>2026-07-02T10:00:00+00:00</lastmod>
  </url>
  <url>
    <loc>https://starwinelist.com/wine-place/spritmuseum</loc>
    <lastmod>2026-06-15</lastmod>
  </url>
  <url>
    <loc>https://starwinelist.com/wine-guide/stockholm</loc>
  </url>
  <url>
    <loc>https://starwinelist.com/wine-place/1066</loc>
    <lastmod>2026-01-01</lastmod>
  </url>
</urlset>`;

const SAMPLE_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://starwinelist.com/sitemap-venues.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://starwinelist.com/sitemap-pages.xml</loc>
  </sitemap>
</sitemapindex>`;

describe("parseSitemapUrlEntries", () => {
  it("parses loc and optional lastmod", () => {
    const rows = parseSitemapUrlEntries(SAMPLE_URLSET);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({
      loc: "https://starwinelist.com/wine-place/brasserie-elverket",
      lastmod: "2026-07-02T10:00:00+00:00",
    });
    expect(rows[2]?.lastmod).toBeUndefined();
  });
});

describe("parseSitemapIndexLocs", () => {
  it("extracts child sitemap URLs", () => {
    expect(parseSitemapIndexLocs(SAMPLE_INDEX)).toEqual([
      "https://starwinelist.com/sitemap-venues.xml",
      "https://starwinelist.com/sitemap-pages.xml",
    ]);
  });
});

describe("toWinePlaceEntries", () => {
  it("filters wine-place slugs and keeps newest lastmod per slug", () => {
    const raw = parseSitemapUrlEntries(SAMPLE_URLSET);
    const entries = toWinePlaceEntries(raw);
    expect(entries.map((e) => e.slug).sort()).toEqual([
      "brasserie-elverket",
      "spritmuseum",
    ]);
    expect(entries.find((e) => e.slug === "spritmuseum")?.lastmod).toBe(
      "2026-06-15",
    );
  });
});

describe("extractWinePlaceSlugFromLoc", () => {
  it("normalizes slug and rejects numeric-only ids", () => {
    expect(
      extractWinePlaceSlugFromLoc(
        "https://starwinelist.com/wine-place/Brasserie-Elverket/",
      ),
    ).toBe("brasserie-elverket");
    expect(
      extractWinePlaceSlugFromLoc("https://starwinelist.com/wine-place/1066"),
    ).toBeNull();
  });
});

describe("parseSitemapLastmod", () => {
  it("parses ISO date and date-only", () => {
    expect(parseSitemapLastmod("2026-07-02T10:00:00+00:00")?.getUTCFullYear()).toBe(
      2026,
    );
    expect(parseSitemapLastmod("2026-06-15")?.getMonth()).toBe(5);
    expect(parseSitemapLastmod(undefined)).toBeNull();
  });
});

describe("shouldBoostFromSitemapLastmod", () => {
  const dayD = "2026-06-15";
  const dayDPlus1 = "2026-06-16";

  it("does not re-boost after crawl on D when detect runs on D+1", () => {
    const entry = {
      lastmod: dayD,
      lastmod_parsed: `${dayD}T00:00:00.000Z`,
    };
    const lastCheckedAt = `${dayD}T14:30:00.000Z`;
    const detectRunAt = new Date(`${dayDPlus1}T00:30:00.000Z`);

    expect(
      shouldBoostFromSitemapLastmod(entry, lastCheckedAt, detectRunAt),
    ).toBe(false);
  });

  it("boosts date-only lastmod when sitemap day advanced past last check", () => {
    const entry = {
      lastmod: dayDPlus1,
      lastmod_parsed: `${dayDPlus1}T00:00:00.000Z`,
    };
    expect(
      shouldBoostFromSitemapLastmod(
        entry,
        `${dayD}T18:00:00.000Z`,
        new Date(`${dayDPlus1}T08:00:00.000Z`),
      ),
    ).toBe(true);
  });

  it("boosts same-day date-only lastmod when still on that calendar day", () => {
    const entry = {
      lastmod: dayD,
      lastmod_parsed: `${dayD}T00:00:00.000Z`,
    };
    expect(
      shouldBoostFromSitemapLastmod(
        entry,
        `${dayD}T08:00:00.000Z`,
        new Date(`${dayD}T18:00:00.000Z`),
      ),
    ).toBe(true);
  });

  it("uses strict > for datetime lastmod against last_checked_at", () => {
    const entry = {
      lastmod: "2026-07-02T10:00:00+00:00",
      lastmod_parsed: "2026-07-02T10:00:00.000Z",
    };
    expect(
      shouldBoostFromSitemapLastmod(entry, "2026-07-02T09:00:00.000Z"),
    ).toBe(true);
    expect(
      shouldBoostFromSitemapLastmod(entry, "2026-07-02T10:00:00.000Z"),
    ).toBe(false);
  });

  it("boosts when last_checked_at is missing", () => {
    expect(
      shouldBoostFromSitemapLastmod(
        { lastmod: dayD, lastmod_parsed: `${dayD}T00:00:00.000Z` },
        null,
      ),
    ).toBe(true);
  });
});

describe("isDateOnlySitemapLastmod", () => {
  it("detects date-only vs datetime", () => {
    expect(isDateOnlySitemapLastmod("2026-06-15")).toBe(true);
    expect(isDateOnlySitemapLastmod("2026-06-15T10:00:00Z")).toBe(false);
    expect(isDateOnlySitemapLastmod(undefined)).toBe(false);
  });
});
