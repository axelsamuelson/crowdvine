import type { AppLocale } from "@/lib/i18n/locale";
import type { WineCategory } from "@/lib/wine-category-types";
import {
  WINE_CATEGORIES_EN,
  WINE_CATEGORIES_SV,
} from "@/lib/wine-categories";
import { GENERATED_SHOP_FILTER_SLUGS } from "@/lib/wine-shop-filter-categories";
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

const FARMING_HUB_SLUGS_SV = [
  "naturvin",
  "ekologiskt-vin",
  "biodynamiskt-vin",
] as const;

const FARMING_HUB_SLUGS_EN = [
  "natural-wine",
  "organic-wine",
  "biodynamic-wine",
] as const;

const FARMING_HUB_COLOR_SLUGS: Record<string, readonly string[]> = {
  naturvin: ["rott-naturvin", "vitt-naturvin", "orange-naturvin"],
  "ekologiskt-vin": ["rott-ekologiskt-vin", "vitt-ekologiskt-vin"],
  "biodynamiskt-vin": ["rott-biodynamiskt-vin"],
  "natural-wine": ["red-natural-wine", "white-natural-wine", "orange-natural-wine"],
  "organic-wine": ["red-organic-wine", "white-organic-wine"],
  "biodynamic-wine": ["red-biodynamic-wine"],
};

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

function farmingHubSlugs(locale: AppLocale): readonly string[] {
  return locale === "sv" ? FARMING_HUB_SLUGS_SV : FARMING_HUB_SLUGS_EN;
}

export function isFarmingMethodHub(category: WineCategory): boolean {
  return farmingHubSlugs(category.locale).includes(
    category.slug as (typeof FARMING_HUB_SLUGS_SV)[number],
  );
}

function farmingHubExploreLinks(category: WineCategory): CategoryExploreLink[] {
  const locale = category.locale;
  const hubSlugs = farmingHubSlugs(locale).filter((s) => s !== category.slug);
  const hubLinks = hubSlugs.map((s) => categoryLink(s, locale));
  const colorSlugs = FARMING_HUB_COLOR_SLUGS[category.slug] ?? [];
  const colorLinks = colorSlugs.map((s) => categoryLink(s, locale));

  return [...hubLinks, ...colorLinks];
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

const LONG_TAIL_GEO_SLUGS = new Set([
  "naturvin-languedoc",
  "naturvin-frankrike",
  "rott-naturvin-languedoc",
  "vitt-naturvin-languedoc",
  "orange-naturvin-languedoc",
  "naturvin-hemleverans-stockholm",
  "direktimport-vin",
  "natural-wine-languedoc",
  "natural-wine-france",
  "red-natural-wine-languedoc",
  "white-natural-wine-languedoc",
  "orange-natural-wine-languedoc",
  "natural-wine-delivery-stockholm",
  "direct-import-wine",
]);

function geoLongTailExploreLinks(
  category: WineCategory,
): CategoryExploreLink[] {
  const locale = category.locale;
  const links: CategoryExploreLink[] = [];
  const seen = new Set<string>();

  const push = (slug: string | null) => {
    if (!slug || slug === category.slug || seen.has(slug)) return;
    seen.add(slug);
    links.push(categoryLink(slug, locale));
  };

  const pushHref = (href: string, label: string) => {
    if (seen.has(href)) return;
    seen.add(href);
    links.push({ href, label });
  };

  push(locale === "sv" ? "naturvin" : "natural-wine");

  if (category.slug.includes("languedoc") || category.slug.includes("frankrike") || category.slug.includes("france")) {
    push(locale === "sv" ? "naturvin-languedoc" : "natural-wine-languedoc");
    pushHref("/languedoc", "Languedoc");
  }

  const color = category.filter.color?.[0];
  if (color === "Red") {
    push(locale === "sv" ? "rott-naturvin" : "red-natural-wine");
  } else if (color === "White") {
    push(locale === "sv" ? "vitt-naturvin" : "white-natural-wine");
  } else if (color === "Orange") {
    push(locale === "sv" ? "orange-naturvin" : "orange-natural-wine");
  }

  if (
    category.slug.includes("stockholm") ||
    category.slug.includes("delivery")
  ) {
    push(locale === "sv" ? "direktimport-vin" : "direct-import-wine");
  }

  if (
    category.slug.includes("direktimport") ||
    category.slug.includes("direct-import")
  ) {
    push(
      locale === "sv"
        ? "naturvin-hemleverans-stockholm"
        : "natural-wine-delivery-stockholm",
    );
  }

  if (category.slug.includes("frankrike") || category.slug.includes("france")) {
    push(locale === "sv" ? "naturvin-frankrike" : "natural-wine-france");
  }

  return links.slice(0, 6);
}

export function isGeoLongTailCategory(category: WineCategory): boolean {
  return LONG_TAIL_GEO_SLUGS.has(category.slug);
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

function farmingHubSlug(
  farming: string,
  locale: AppLocale,
): string | null {
  if (farming === "natural") {
    return locale === "sv" ? "naturvin" : "natural-wine";
  }
  if (farming === "organic_certified") {
    return locale === "sv" ? "ekologiskt-vin" : "organic-wine";
  }
  if (farming === "biodynamic_certified") {
    return locale === "sv" ? "biodynamiskt-vin" : "biodynamic-wine";
  }
  return null;
}

function colorHubSlugForFilter(
  color: string,
  farming: string | undefined,
  locale: AppLocale,
): string | null {
  if (color === "Red" && farming === "natural") {
    return locale === "sv" ? "rott-naturvin" : "red-natural-wine";
  }
  if (color === "White" && farming === "natural") {
    return locale === "sv" ? "vitt-naturvin" : "white-natural-wine";
  }
  if (color === "Orange" && farming === "natural") {
    return locale === "sv" ? "orange-naturvin" : "orange-natural-wine";
  }
  if (color === "Red") {
    return locale === "sv" ? "rott-vin" : "red-wine";
  }
  if (color === "White") {
    return locale === "sv" ? "vitt-vin" : "white-wine";
  }
  if (color === "Orange") {
    return locale === "sv" ? "orange-vin" : "orange-wine";
  }
  if (color === "Red & White") {
    return null;
  }
  if (color === "Red & Orange") {
    return locale === "sv" ? "rod-och-orange-vin" : "red-and-orange-wine";
  }
  return null;
}

function generatedFilterExploreLinks(
  category: WineCategory,
): CategoryExploreLink[] {
  const locale = category.locale;
  const links: CategoryExploreLink[] = [];
  const seen = new Set<string>();

  const push = (slug: string | null) => {
    if (!slug || slug === category.slug || seen.has(slug)) return;
    seen.add(slug);
    links.push(categoryLink(slug, locale));
  };

  const color = category.filter.color?.[0];
  const farming = category.filter.farming?.[0];

  if (farming) {
    push(farmingHubSlug(farming, locale));
  }
  if (color) {
    push(colorHubSlugForFilter(color, farming, locale));
  }
  if (color === "Red & Orange" && farming === "natural") {
    push(locale === "sv" ? "orange-naturvin" : "orange-natural-wine");
  }
  if (color === "Red & White" && farming === "natural") {
    push(locale === "sv" ? "rott-naturvin" : "red-natural-wine");
    push(locale === "sv" ? "vitt-naturvin" : "white-natural-wine");
  }
  if (!farming && color === "Red & White") {
    push(locale === "sv" ? "rott-vin" : "red-wine");
    push(locale === "sv" ? "vitt-vin" : "white-wine");
    push(locale === "sv" ? "naturvin" : "natural-wine");
  }

  return links.slice(0, 6);
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

  if (isFarmingMethodHub(category)) {
    return farmingHubExploreLinks(category);
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

  if (GENERATED_SHOP_FILTER_SLUGS.has(category.slug)) {
    const filterLinks = generatedFilterExploreLinks(category);
    if (filterLinks.length > 0) return filterLinks;
  }

  if (isGeoLongTailCategory(category)) {
    const geoLinks = geoLongTailExploreLinks(category);
    if (geoLinks.length > 0) return geoLinks;
  }

  return legacyRelatedLinks(category);
}
