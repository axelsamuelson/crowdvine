import { MetadataRoute } from "next";

import { generateProducerSlug } from "@/lib/producer-handle";
import {
  dedupeSitemapEntries,
  fetchDynamicGrapeSlugs,
  fetchIndexableProducers,
  fetchIndexableWines,
  fetchProducerShopSlugs,
  getKnownCategorySlugs,
} from "@/lib/sitemap-urls";
import { WINE_CATEGORIES_EN, WINE_CATEGORIES_SV } from "@/lib/wine-categories";

// dirtywine.se använder samma sitemap via robots.txt som pekar till pactwines.com/sitemap.xml
// En separat sitemap för dirtywine.se kan implementeras via en dedikerad route om Google
// Search Console kräver det.

const baseUrl = "https://pactwines.com";

type SitemapEntry = MetadataRoute.Sitemap[number];

function weeklyEntry(
  url: string,
  priority: number,
  lastModified = new Date(),
): SitemapEntry {
  return {
    url,
    lastModified,
    changeFrequency: "weekly",
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    weeklyEntry(baseUrl, 1.0),
    {
      url: `${baseUrl}/vin`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/wine`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    weeklyEntry(`${baseUrl}/producers`, 0.8),
    weeklyEntry(`${baseUrl}/about`, 0.5),
    weeklyEntry(`${baseUrl}/how-it-works`, 0.7),
    weeklyEntry(`${baseUrl}/languedoc`, 0.7),
    weeklyEntry(`${baseUrl}/languedoc/naturvin`, 0.7),
    weeklyEntry(`${baseUrl}/vin/wine-boxes`, 0.75),
    weeklyEntry(`${baseUrl}/wine/wine-boxes`, 0.75),
  ];

  const indexableWines = await fetchIndexableWines();

  const winePages: MetadataRoute.Sitemap = indexableWines.flatMap((w) => {
    const lastModified = w.updated_at ? new Date(w.updated_at) : new Date();
    const entry = {
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
    return [
      { url: `${baseUrl}/product/${w.handle}`, ...entry },
      { url: `${baseUrl}/produkt/${w.handle}`, ...entry },
    ];
  });

  const indexableProducers = await fetchIndexableProducers();

  const producerProfilePages: MetadataRoute.Sitemap = indexableProducers
    .filter((p) => Boolean(p.name?.trim()))
    .flatMap((p) => {
      const slug = generateProducerSlug(p.name);
      const lastModified = p.created_at ? new Date(p.created_at) : new Date();
      const entry = {
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
      return [
        { url: `${baseUrl}/producer/${slug}`, ...entry },
        { url: `${baseUrl}/producent/${slug}`, ...entry },
      ];
    });

  const vinCategories: MetadataRoute.Sitemap = WINE_CATEGORIES_SV.map((c) =>
    weeklyEntry(`${baseUrl}/vin/${c.slug}`, 0.8),
  );

  const wineCategories: MetadataRoute.Sitemap = WINE_CATEGORIES_EN.map((c) =>
    weeklyEntry(`${baseUrl}/wine/${c.slug}`, 0.7),
  );

  const knownCategorySlugs = getKnownCategorySlugs();

  const dynamicGrapeSlugs = await fetchDynamicGrapeSlugs(knownCategorySlugs);
  const dynamicGrapePages: MetadataRoute.Sitemap = dynamicGrapeSlugs.flatMap(
    (slug) => [
      weeklyEntry(`${baseUrl}/vin/${slug}`, 0.75),
      weeklyEntry(`${baseUrl}/wine/${slug}`, 0.75),
    ],
  );

  const producerShopSlugs = await fetchProducerShopSlugs();
  const producerShopPages: MetadataRoute.Sitemap = producerShopSlugs.flatMap(
    (slug) => [
      weeklyEntry(`${baseUrl}/vin/${slug}`, 0.75),
      weeklyEntry(`${baseUrl}/wine/${slug}`, 0.75),
    ],
  );

  return dedupeSitemapEntries([
    ...staticPages,
    ...vinCategories,
    ...wineCategories,
    ...dynamicGrapePages,
    ...producerShopPages,
    ...winePages,
    ...producerProfilePages,
  ]);
}
