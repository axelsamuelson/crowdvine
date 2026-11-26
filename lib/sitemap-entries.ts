import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";

import {
  catalogHasProducts,
  catalogLiveCount,
  fetchProductsData,
} from "@/lib/crowdvine/products-data";
import {
  NATURAL_VS_ORGANIC_PATH,
  NATURAL_VS_ORGANIC_UPDATED,
} from "@/lib/guides/articles/natural-vs-organic-vs-biodynamic-wine";
import { publishedBilingualArticleGuides } from "@/lib/guides/guide-publication";
import { GUIDE_PATHS } from "@/lib/guides/guide-routes";
import { TOP_100_PRODUCERS_UPDATED_AT } from "@/lib/guides/top-100-producers";
import { TOP_100_WINES_UPDATED_AT } from "@/lib/guides/top-100-wines";
import { worldsBestNaturalChampagneGuide } from "@/lib/guides/worlds-best-natural-champagne";
import { worldsBestOrangeWinesGuide } from "@/lib/guides/worlds-best-orange-wines";
import { articlePath, articleUpdatedOn } from "@/lib/guides/guide-types";
import { generateProducerSlug } from "@/lib/producer-handle";
import {
  isNoindexCategorySlug,
} from "@/lib/seo/noindex-robots";
import { producerBoxesSitemapPaths } from "@/lib/producer-boxes/config";
import { STOCKHOLM_DELIVERY_SITEMAP_SLUGS } from "@/lib/stockholm-delivery-landing/dirtywine-redirect";
import {
  getHreflangPath,
  WINE_CATEGORIES_EN,
  WINE_CATEGORIES_SV,
  type WineCategory,
} from "@/lib/wine-categories";
import {
  isColorFarmingComboCategory,
  isWineRegionShopCategory,
  LEGACY_SHOP_REDIRECT_SLUGS,
} from "@/lib/wine-shop-filter-categories";
import {
  dedupeSitemapEntries,
  fetchIndexableProducersWithWines,
  fetchIndexableWines,
  fetchProducerShopSlugs,
} from "@/lib/sitemap-urls";
import { getLiveWineRegionCountsMap } from "@/lib/wine-region-live-counts";
import {
  indexableWineRegionPaths,
  WINE_COMBO_INDEX_MIN_LIVE,
  WINE_COMBO_LIVE_COUNT_CAP,
} from "@/lib/wine-regions";

export type SitemapSiteProfile = "pact" | "dirtywine";

type SitemapEntry = MetadataRoute.Sitemap[number];

function languageAlternates(svUrl: string, enUrl: string) {
  return {
    languages: {
      "sv-SE": svUrl,
      en: enUrl,
      "x-default": enUrl,
    },
  };
}

function weeklyEntry(
  url: string,
  priority: number,
  lastModified = new Date(),
  alternates?: SitemapEntry["alternates"],
): SitemapEntry {
  return {
    url,
    lastModified,
    changeFrequency: "weekly",
    priority,
    ...(alternates ? { alternates } : {}),
  };
}

function pairedCategoryEntry(
  category: WineCategory,
  baseUrl: string,
  priority: number,
): SitemapEntry {
  const self = `${baseUrl}${category.locale === "sv" ? "/vin" : "/wine"}/${category.slug}`;
  const otherPath = getHreflangPath(category);
  const other = otherPath.startsWith("http") ? otherPath : `${baseUrl}${otherPath}`;
  const svUrl = category.locale === "sv" ? self : other;
  const enUrl = category.locale === "en" ? self : other;
  return weeklyEntry(self, priority, new Date(), languageAlternates(svUrl, enUrl));
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
    weeklyEntry(`${baseUrl}/en`, 1.0),
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
    yearlyEntry(`${baseUrl}/terms`, 0.3),
    yearlyEntry(`${baseUrl}/integritetspolicy`, 0.3),
    yearlyEntry(`${baseUrl}/cookies`, 0.3),
    // EN /privacy and /cookie-policy remain noindex until English copy ships.
    // /how-it-works permanently redirects to /om-oss — keep it out of the sitemap.
  ];

  if (profile === "pact") {
    pages.push(
      weeklyEntry(`${baseUrl}/guider`, 0.7),
      weeklyEntry(
        `${baseUrl}/guider/varldens-basta-naturviner`,
        0.75,
        new Date(`${TOP_100_WINES_UPDATED_AT}T00:00:00.000Z`),
      ),
      weeklyEntry(
        `${baseUrl}/guider/varldens-basta-naturvinsproducenter`,
        0.75,
        new Date(`${TOP_100_PRODUCERS_UPDATED_AT}T00:00:00.000Z`),
      ),
      weeklyEntry(`${baseUrl}/guides`, 0.7),
      weeklyEntry(
        `${baseUrl}/guides/worlds-best-natural-wines`,
        0.75,
        new Date(`${TOP_100_WINES_UPDATED_AT}T00:00:00.000Z`),
      ),
      weeklyEntry(
        `${baseUrl}/guides/worlds-best-natural-wine-producers`,
        0.75,
        new Date(`${TOP_100_PRODUCERS_UPDATED_AT}T00:00:00.000Z`),
      ),
      ...publishedBilingualArticleGuides().flatMap((guide) => {
        const lastModifiedFor = (locale: "en" | "sv") => {
          const day = articleUpdatedOn(guide, locale);
          return day ? new Date(`${day}T00:00:00.000Z`) : new Date();
        };
        const en = `${baseUrl}${articlePath(guide, "en")}`;
        const sv = `${baseUrl}${articlePath(guide, "sv")}`;
        const alternates = languageAlternates(sv, en);
        return [
          weeklyEntry(en, 0.75, lastModifiedFor("en"), alternates),
          weeklyEntry(sv, 0.75, lastModifiedFor("sv"), alternates),
        ];
      }),
      // English-only label comparison guide (no Swedish route yet).
      weeklyEntry(
        `${baseUrl}${NATURAL_VS_ORGANIC_PATH}`,
        0.75,
        new Date(`${NATURAL_VS_ORGANIC_UPDATED}T00:00:00.000Z`),
      ),
      weeklyEntry(
        `${baseUrl}${GUIDE_PATHS.orangeWines.en}`,
        0.75,
        new Date(`${worldsBestOrangeWinesGuide.updated}T00:00:00.000Z`),
      ),
      weeklyEntry(
        `${baseUrl}${GUIDE_PATHS.orangeWines.sv}`,
        0.75,
        new Date(`${worldsBestOrangeWinesGuide.updated}T00:00:00.000Z`),
      ),
      weeklyEntry(
        `${baseUrl}${GUIDE_PATHS.naturalChampagne.en}`,
        0.75,
        new Date(`${worldsBestNaturalChampagneGuide.updated}T00:00:00.000Z`),
      ),
      weeklyEntry(
        `${baseUrl}${GUIDE_PATHS.naturalChampagne.sv}`,
        0.75,
        new Date(`${worldsBestNaturalChampagneGuide.updated}T00:00:00.000Z`),
      ),
      ...producerBoxesSitemapPaths().map((path) =>
        weeklyEntry(`${baseUrl}${path}`, 0.75),
      ),
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
    [
      "sitemap-entries",
      baseUrl,
      profile,
      ...producerBoxesSitemapPaths(),
      // Bust when legacy redirects / category lists change (otherwise 1h stale URLs).
      ...Array.from(LEGACY_SHOP_REDIRECT_SLUGS).sort(),
      ...WINE_CATEGORIES_SV.map((c) => c.slug),
      ...WINE_CATEGORIES_EN.map((c) => c.slug),
      String(WINE_COMBO_INDEX_MIN_LIVE),
      String(WINE_COMBO_LIVE_COUNT_CAP),
    ],
    { revalidate: 3600 },
  )();
}

async function buildSitemapEntriesUncached(
  baseUrl: string,
  profile: SitemapSiteProfile,
): Promise<MetadataRoute.Sitemap> {
  // dirtywine.se: index only the homepage; shared catalog paths canonicalize to pact.
  if (profile === "dirtywine") {
    return [weeklyEntry(baseUrl, 1.0)];
  }

  const staticPages = staticPagesForProfile(baseUrl, profile);
  const isDirtyWine = false;
  const visibleB2BWines = isDirtyWine
    ? await fetchProductsData({ isB2BSite: true, limit: 5000 })
    : null;
  const visibleHandles = visibleB2BWines
    ? new Set(visibleB2BWines.map((wine) => wine.handle))
    : null;
  const visibleProducerSlugs = visibleB2BWines
    ? new Set(
        visibleB2BWines
          .map((wine) => generateProducerSlug(wine.producerName))
          .filter((slug) => slug.length > 0),
      )
    : null;

  const indexableWines = (await fetchIndexableWines()).filter((wine) =>
    visibleHandles ? visibleHandles.has(wine.handle) : true,
  );

  const winePages: MetadataRoute.Sitemap = indexableWines.flatMap((w) => {
    const lastModified = w.updated_at ? new Date(w.updated_at) : new Date();
    const entry = {
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
    const en = `${baseUrl}/product/${w.handle}`;
    const sv = `${baseUrl}/produkt/${w.handle}`;
    const languages = {
      "sv-SE": sv,
      en,
      "x-default": en,
    };
    return [
      { url: en, ...entry, alternates: { languages } },
      { url: sv, ...entry, alternates: { languages } },
    ];
  });

  const indexableProducers = await fetchIndexableProducersWithWines();

  const producerProfilePages: MetadataRoute.Sitemap = indexableProducers
    .filter((p) => Boolean(p.name?.trim()))
    .filter((p) =>
      visibleProducerSlugs
        ? visibleProducerSlugs.has(generateProducerSlug(p.name))
        : true,
    )
    .flatMap((p) => {
      const slug = generateProducerSlug(p.name);
      const lastModified = p.updated_at
        ? new Date(p.updated_at)
        : p.created_at
          ? new Date(p.created_at)
          : new Date();
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
    (c) =>
      !isWineRegionShopCategory(c) &&
      !isNoindexCategorySlug(c.slug, "sv") &&
      !LEGACY_SHOP_REDIRECT_SLUGS.has(c.slug) &&
      !(isDirtyWine && STOCKHOLM_DELIVERY_SITEMAP_SLUGS.has(c.slug)),
  );
  const wineCategoryCandidates = WINE_CATEGORIES_EN.filter(
    (c) =>
      !isWineRegionShopCategory(c) &&
      !isNoindexCategorySlug(c.slug, "en") &&
      !LEGACY_SHOP_REDIRECT_SLUGS.has(c.slug) &&
      !(isDirtyWine && STOCKHOLM_DELIVERY_SITEMAP_SLUGS.has(c.slug)),
  );

  const vinCategories: MetadataRoute.Sitemap = (
    await Promise.all(
      vinCategoryCandidates.map(async (c) => {
        const filters = {
          filterColor: c.filter.color,
          filterTags: c.filter.tags,
          filterIsNatural: c.filter.isNatural,
          filterFarming: c.filter.farming,
          filterGrape: c.filter.filterGrape,
          filterCountryCode: c.filter.countryCode,
          filterRegion: c.filter.region,
          filterWineRegion: c.filter.wineRegion,
          isB2BSite: isDirtyWine,
        };
        if (isColorFarmingComboCategory(c)) {
          const liveCount = await catalogLiveCount(
            filters,
            WINE_COMBO_LIVE_COUNT_CAP,
          );
          return liveCount >= WINE_COMBO_INDEX_MIN_LIVE
            ? pairedCategoryEntry(c, baseUrl, 0.8)
            : null;
        }
        const hasProducts = await catalogHasProducts(filters);
        return hasProducts ? pairedCategoryEntry(c, baseUrl, 0.8) : null;
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
          filterCountryCode: c.filter.countryCode,
          filterRegion: c.filter.region,
          filterWineRegion: c.filter.wineRegion,
          isB2BSite: isDirtyWine,
        });
        return hasProducts ? pairedCategoryEntry(c, baseUrl, 0.7) : null;
      }),
    )
  ).filter((e): e is NonNullable<typeof e> => e != null);
  // Dynamic grape PLPs (one-line generated copy) stay out of the sitemap.
  // Editorial grape pages already land via vinCategories / wineCategories.

  const producerShopSlugs = (await fetchProducerShopSlugs()).filter((slug) =>
    visibleProducerSlugs ? visibleProducerSlugs.has(slug) : true,
  );
  const producerShopPages: MetadataRoute.Sitemap = producerShopSlugs.flatMap(
    (slug) => {
      const sv = `${baseUrl}/vin/${slug}`;
      const en = `${baseUrl}/wine/${slug}`;
      const alternates = languageAlternates(sv, en);
      return [
        weeklyEntry(sv, 0.75, new Date(), alternates),
        weeklyEntry(en, 0.75, new Date(), alternates),
      ];
    },
  );

  // Region shop pages: sitemap only when ≥3 live wines (wine ∧ producer).
  const regionCounts = await getLiveWineRegionCountsMap();
  const regionPages: MetadataRoute.Sitemap = indexableWineRegionPaths(
    regionCounts,
  ).flatMap(({ sv, en }) => {
    const svUrl = `${baseUrl}${sv}`;
    const enUrl = `${baseUrl}${en}`;
    const alternates = languageAlternates(svUrl, enUrl);
    return [
      weeklyEntry(svUrl, 0.75, new Date(), alternates),
      weeklyEntry(enUrl, 0.75, new Date(), alternates),
    ];
  });

  return dedupeSitemapEntries([
    ...staticPages,
    ...vinCategories,
    ...wineCategories,
    ...producerShopPages,
    ...regionPages,
    ...winePages,
    ...producerProfilePages,
  ]);
}
