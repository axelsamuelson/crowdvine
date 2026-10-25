import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/crowdvine/producer-by-slug-data", () => ({
  getProducerBySlugForLocale: vi.fn(),
}));

vi.mock("@/lib/site-config-server", () => ({
  getSiteConfig: vi.fn(),
}));

vi.mock("@/lib/crowdvine/products-data", () => ({
  fetchCollectionProductsData: vi.fn(async () => []),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: () => null,
  })),
}));

import { getProducerBySlugForLocale } from "@/lib/crowdvine/producer-by-slug-data";
import { buildProducerPublicMetadata } from "@/lib/i18n/producer-public-page";
import { getSiteConfig } from "@/lib/site-config-server";

describe("buildProducerPublicMetadata", () => {
  beforeEach(() => {
    vi.mocked(getSiteConfig).mockResolvedValue({
      name: "PACT",
      siteName: "PACT Wines",
      baseUrl: "https://pactwines.com",
      defaultTitle: "PACT",
      defaultDescription: "desc",
      twitterHandle: "@pact",
    } as Awaited<ReturnType<typeof getSiteConfig>>);

    vi.mocked(getProducerBySlugForLocale).mockResolvedValue({
      producer: {
        id: "p1",
        name: "Château del Ranq",
        region: "Languedoc",
        subregion: null,
        country: "FR",
        founded_year: null,
        certification: null,
        contact_name: null,
        website_url: null,
        instagram_handle: null,
        bio_short: "Short bio in English.",
        bio_long: null,
        slug: "chateau-del-ranq",
        lat: 0,
        lon: 0,
      },
      wines: [{ id: "w1" }],
    } as Awaited<ReturnType<typeof getProducerBySlugForLocale>>);
  });

  it("returns title, description, self canonical and EN x-default for SV profile", async () => {
    const meta = await buildProducerPublicMetadata(
      "chateau-del-ranq",
      "sv",
      "producenter",
    );

    expect(String(meta.title)).toContain("Château del Ranq");
    expect(meta.description).toBeTruthy();
    expect(meta.alternates?.canonical).toBe(
      "https://pactwines.com/producenter/chateau-del-ranq",
    );
    expect(meta.alternates?.languages).toEqual({
      sv: "https://pactwines.com/producenter/chateau-del-ranq",
      en: "https://pactwines.com/producers/chateau-del-ranq",
      "x-default": "https://pactwines.com/producers/chateau-del-ranq",
    });
    expect(meta.openGraph?.images).toBeTruthy();
  });

  it("returns EN canonical for EN profile", async () => {
    const meta = await buildProducerPublicMetadata(
      "chateau-del-ranq",
      "en",
      "producers",
    );

    expect(meta.alternates?.canonical).toBe(
      "https://pactwines.com/producers/chateau-del-ranq",
    );
    expect(meta.alternates?.languages?.["x-default"]).toBe(
      "https://pactwines.com/producers/chateau-del-ranq",
    );
  });
});
