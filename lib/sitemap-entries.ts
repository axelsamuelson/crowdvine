import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";

import { catalogHasProducts } from "@/lib/crowdvine/products-data";
import { BILINGUAL_ARTICLE_GUIDES } from "@/lib/guides/bilingual-article-guides";
import { GUIDE_PATHS } from "@/lib/guides/guide-routes";
import { articlePath } from "@/lib/guides/guide-types";
import { generateProducerSlug } from "@/lib/producer-handle";
import {
  isNoindexCategorySlug,
} from "@/lib/seo/noindex-robots";
import {
  listIssues,
  recommendationIndexPath,
  recommendationIssuePath,
} from "@/lib/systembolaget/recommendations";
import { WINE_CATEGORIES_EN, WINE_CATEGORIES_SV } from "@/lib/wine-categories";
import {
  dedupeSitemapEntries,
  fetchDynamicGrapeSlugs,
  fetchIndexableProducersWithWines,
  fetchIndexableWines,
  fetchProducerShopSlugs,
  getKnownCategorySlugs,
} from "@/lib/sitemap-urls";

export type SitemapSiteProfile = "pact" | "dirtywine";

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

function yearlyEntry(
  url: string,
  priority: number,
  lastModified = new Date(),
): SitemapEntry {
  return {
    url,
    lastModified,
    changeFrequency: "yearly",
    priority,
  };
}

function staticPagesForProfile(
  baseUrl: string,
  profile: SitemapSiteProfile,
): SitemapEntry[] {
  const pages: SitemapEntry[] = [
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
    weeklyEntry(`${baseUrl}/producenter`, 0.8),
    weeklyEntry(`${baseUrl}/about`, 0.5),
    weeklyEntry(`${baseUrl}/om-oss`, 0.5),
    yearlyEntry(`${baseUrl}/villkor`, 0.3),
    yearlyEntry(`${baseUrl}/integritetspolicy`, 0.3),
    yearlyEntry(`${baseUrl}/cookies`, 0.3),
    // EN legal URLs exist for hreflang but are noindex until English copy ships.
    weeklyEntry(`${baseUrl}/how-it-works`, 0.4),
  ];

  if (profile === "pact") {
    pages.push(
      weeklyEntry(`${baseUrl}/guider`, 0.7),
      weeklyEntry(`${baseUrl}/guider/varldens-basta-naturviner`, 0.75),
      weeklyEntry(
        `${baseUrl}/guider/varldens-basta-naturvinsproducenter`,
        0.75,
      ),
      weeklyEntry(`${baseUrl}/guides`, 0.7),
      weeklyEntry(`${baseUrl}/guides/worlds-best-natural-wines`, 0.75),
      weeklyEntry(
        `${baseUrl}/guides/worlds-best-natural-wine-producers`,
        0.75,
      ),
      ...BILINGUAL_ARTICLE_GUIDES.flatMap((guide) => {
        const sv = weeklyEntry(`${baseUrl}${articlePath(guide, "sv")}`, 0.75);
        // EN budget guide is interim Swedish copy + noindex — keep out of sitemap.
        if (guide.slug.en === "best-natural-wines-under-200-systembolaget") {
          return [sv];
        }
        return [
          weeklyEntry(`${baseUrl}${articlePath(guide, "en")}`, 0.75),
          sv,
        ];
      }),
      weeklyEntry(`${baseUrl}${GUIDE_PATHS.orangeWines.en}`, 0.75),
      weeklyEntry(`${baseUrl}${GUIDE_PATHS.orangeWines.sv}`, 0.75),
      weeklyEntry(`${baseUrl}${GUIDE_PATHS.naturalChampagne.en}`, 0.75),
      weeklyEntry(`${baseUrl}${GUIDE_PATHS.naturalChampagne.sv}`, 0.75),
      weeklyEntry(`${baseUrl}/vin/wine-boxes`, 0.75),
      weeklyEntry(`${baseUrl}/wine/wine-boxes`, 0.75),
    );
  }

  return pages;
}

/** Build deduplicated sitemap entries for pactwines.com or dirtywine.se. */
export async function buildSitemapEntries(
  baseUrl: string,
  profile: SitemapSiteProfile,
): Promise<MetadataRoute.Sitemap> {
  return unstable_cache(
    () => buildSitemapEntriesUncached(baseUrl, profile),
    ["sitemap-entries", baseUrl, profile],
    { revalidate: 3600 },
  )();
}

async function buildSitemapEntriesUncached(
  baseUrl: string,
  profile: SitemapSiteProfile,
): Promise<MetadataRoute.Sitemap> {
  const staticPages = staticPagesForProfile(baseUrl, profile);

  const recommendationPages: SitemapEntry[] = [];
  if (profile === "pact") {
    try {
      const issues = await listIssues();
      if (issues.length > 0) {
        recommendationPages.push(
          weeklyEntry(`${baseUrl}${recommendationIndexPath("sv")}`, 0.7),
          weeklyEntry(`${baseUrl}${recommendationIndexPath("en")}`, 0.7),
        );
      }
      for (const issue of issues) {
        recommendationPages.push(
          weeklyEntry(
            `${baseUrl}${recommendationIssuePath(issue.year, issue.week, "sv")}`,
            0.65,
            new Date(issue.published_at),
          ),
          weeklyEntry(
            `${baseUrl}${recommendationIssuePath(issue.year, issue.week, "en")}`,
            0.65,
            new Date(issue.published_at),
          ),
        );
      }
    } catch (err) {
      console.error("[sitemap] recommendation issues", err);
    }
  }

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

  const indexableProducers = await fetchIndexableProducersWithWines();

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
        { url: `${baseUrl}/producers/${slug}`, ...entry },
        { url: `${baseUrl}/producenter/${slug}`, ...entry },
      ];
    });

  const vinCategoryCandidates = WINE_CATEGORIES_SV.filter(
    (c) => !isNoindexCategorySlug(c.slug, "sv"),
  );
  const wineCategoryCandidates = WINE_CATEGORIES_EN.filter(
    (c) => !isNoindexCategorySlug(c.slug, "en"),
  );

  const vinCategories: MetadataRoute.Sitemap = (
    await Promise.all(
      vinCategoryCandidates.map(async (c) => {
        const hasProducts = await catalogHasProducts({
          filterColor: c.filter.color,
          filterTags: c.filter.tags,
          filterIsNatural: c.filter.isNatural,
          filterFarming: c.filter.farming,
          filterGrape: c.filter.filterGrape,
        });
        return hasProducts ? weeklyEntry(`${baseUrl}/vin/${c.slug}`, 0.8) : null;
      }),
    )
  ).filter((e): e is NonNullable<typeof e> => e != null);

  const wineCategories: MetadataRoute.Sitemap = (
    await Promise.all(
      wineCategoryCandidates.map(async (c) => {
        const hasProducts = await catalogHasProducts({
          filterColor: c.filter.color,
          filterTags: c.filter.tags,
          filterIsNatural: c.filter.isNatural,
          filterFarming: c.filter.farming,
          filterGrape: c.filter.filterGrape,
        });
        return hasProducts ? weeklyEntry(`${baseUrl}/wine/${c.slug}`, 0.7) : null;
      }),
    )
  ).filter((e): e is NonNullable<typeof e> => e != null);
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
    ...recommendationPages,
    ...vinCategories,
    ...wineCategories,
    ...dynamicGrapePages,
    ...producerShopPages,
    ...winePages,
    ...producerProfilePages,
  ]);
}
