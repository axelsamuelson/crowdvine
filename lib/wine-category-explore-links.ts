import type { AppLocale } from "@/lib/i18n/locale";
import { getWineCategoryContentOverride } from "@/lib/wine-category-content";
import type { WineCategory } from "@/lib/wine-category-types";
import {
  WINE_CATEGORIES_EN,
  WINE_CATEGORIES_SV,
} from "@/lib/wine-categories";
import { isGrapeOnlyCategory } from "@/lib/wine-grape-categories";

export type CategoryExploreLink = {
  href: string;
  label: string;
};

const COLOR_HUB_SLUGS_SV = [
  "naturvin",
  "rott-naturvin",
  "vitt-naturvin",
  "orange-naturvin",
] as const;

const COLOR_HUB_SLUGS_EN = [
  "natural-wine",
  "red-natural-wine",
  "white-natural-wine",
  "orange-natural-wine",
] as const;

const RED_GRAPE_SLUGS = new Set([
  "carignan",
  "grenache",
  "syrah",
  "cinsault",
]);

const COLOR_HUB_GRAPE_SLUGS: Record<string, readonly string[]> = {
  naturvin: ["carignan", "grenache", "cinsault"],
  "rott-naturvin": ["carignan", "grenache", "syrah"],
  "vitt-naturvin": ["grenache-blanc"],
  "orange-naturvin": ["grenache-blanc"],
  "natural-wine": ["carignan", "grenache", "cinsault"],
  "red-natural-wine": ["carignan", "grenache", "syrah"],
  "white-natural-wine": ["grenache-blanc"],
  "orange-natural-wine": ["grenache-blanc"],
};

function categoriesForLocale(locale: AppLocale) {
  return locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;
}

function colorHubSlugs(locale: AppLocale): readonly string[] {
  return locale === "sv" ? COLOR_HUB_SLUGS_SV : COLOR_HUB_SLUGS_EN;
}

export function isColorNaturvinHub(category: WineCategory): boolean {
  return colorHubSlugs(category.locale).includes(
    category.slug as (typeof COLOR_HUB_SLUGS_SV)[number],
  );
}

function categoryLink(slug: string, locale: AppLocale): CategoryExploreLink {
  const cat = categoriesForLocale(locale).find((c) => c.slug === slug);
  return {
    href: cat?.canonical ?? (locale === "sv" ? `/vin/${slug}` : `/wine/${slug}`),
    label: cat?.h1 ?? slug,
  };
}

function siblingGrapeLinks(
  category: WineCategory,
  limit = 4,
): CategoryExploreLink[] {
  const categories = categoriesForLocale(category.locale);
  return categories
    .filter(
      (c) =>
        c.slug !== category.slug &&
        Boolean(c.filter.filterGrape) &&
        !c.filter.color?.length &&
        !c.filter.farming?.length &&
        !c.filter.tags?.length,
    )
    .slice(0, limit)
    .map((c) => ({ href: c.canonical, label: c.h1 }));
}

function grapeHubLinks(category: WineCategory): CategoryExploreLink[] {
  const locale = category.locale;
  const links: CategoryExploreLink[] = [categoryLink("naturvin", locale)];

  if (locale === "en") {
    links[0] = categoryLink("natural-wine", locale);
  }

  if (RED_GRAPE_SLUGS.has(category.slug)) {
    links.unshift(categoryLink("rott-naturvin", locale));
    if (locale === "en") {
      links[0] = categoryLink("red-natural-wine", locale);
    }
  } else if (category.slug === "grenache-blanc") {
    links.unshift(categoryLink("vitt-naturvin", locale));
    if (locale === "en") {
      links[0] = categoryLink("white-natural-wine", locale);
    }
  }

  return links;
}

function colorHubExploreLinks(category: WineCategory): CategoryExploreLink[] {
  const locale = category.locale;
  const hubSlugs = colorHubSlugs(locale).filter((s) => s !== category.slug);
  const hubLinks = hubSlugs.map((s) => categoryLink(s, locale));
  const grapeSlugs = COLOR_HUB_GRAPE_SLUGS[category.slug] ?? [];
  const grapeLinks = grapeSlugs.map((s) => categoryLink(s, locale));

  return [...hubLinks, ...grapeLinks];
}

function legacyRelatedLinks(
  category: WineCategory,
  limit = 4,
): CategoryExploreLink[] {
  const categories = categoriesForLocale(category.locale);
  return categories
    .filter(
      (c) =>
        c.slug !== category.slug &&
        !c.slug.includes("languedoc") &&
        !c.slug.includes("frankrike") &&
        !c.slug.includes("france") &&
        !c.slug.includes("stockholm") &&
        !c.slug.includes("direktimport") &&
        !c.slug.includes("direct-import"),
    )
    .slice(0, limit)
    .map((c) => ({ href: c.canonical, label: c.h1 }));
}

export function getCategoryLongDescriptionHeading(
  category: WineCategory,
): string {
  if (category.contentHeading?.trim()) {
    return category.contentHeading.trim();
  }

  if (category.filter.filterGrape) {
    return category.locale === "sv" ? "Om druvsorten" : "About the grape";
  }

  const h1Lower =
    category.h1.charAt(0).toLowerCase() + category.h1.slice(1);
  return category.locale === "sv" ? `Om ${h1Lower}` : `About ${h1Lower}`;
}

export function getCategoryExploreLinks(
  category: WineCategory,
): CategoryExploreLink[] {
  if (isColorNaturvinHub(category)) {
    return colorHubExploreLinks(category);
  }

  if (isGrapeOnlyCategory(category)) {
    const seen = new Set<string>();
    const merged = [...grapeHubLinks(category), ...siblingGrapeLinks(category)];
    return merged.filter((link) => {
      if (seen.has(link.href)) return false;
      seen.add(link.href);
      return true;
    });
  }

  return legacyRelatedLinks(category);
}
