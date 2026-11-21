import {
  NATURAL_VS_ORGANIC_PATH,
  naturalVsOrganicProducerGroups,
} from "@/lib/guides/articles/natural-vs-organic-vs-biodynamic-wine";
import { guideCopy } from "@/lib/guides/guide-copy";
import { GUIDE_PATHS, guidePath } from "@/lib/guides/guide-routes";
import {
  ALL_PRODUCER_GUIDES,
  producerGuidePath,
} from "@/lib/guides/producer-guide-links";
import { GUIDE_SHOP_LINKS } from "@/lib/guides/shop-links";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";
import type { AppLocale } from "@/lib/i18n/locale";
import { generateProducerSlug } from "@/lib/producer-handle";

export type ProducerMentionedGuide = {
  href: string;
  title: string;
};

/** Known guide titles for shop-link paths that are not article registry entries. */
const GUIDE_PATH_TITLES: Record<
  string,
  { sv: string; en: string }
> = {
  "/guides/beaujolais-natural-wine": {
    en: "Beaujolais natural wine",
    sv: "Naturvin från Beaujolais",
  },
  "/guider/beaujolais-natural-wine": {
    en: "Beaujolais natural wine",
    sv: "Naturvin från Beaujolais",
  },
  "/guides/jura-natural-wine": {
    en: "Jura natural wine",
    sv: "Naturvin från Jura",
  },
  "/guider/jura-natural-wine": {
    en: "Jura natural wine",
    sv: "Naturvin från Jura",
  },
  "/guides/gang-of-four-wine": {
    en: "The Gang of Four",
    sv: "Gang of Four",
  },
  "/guider/gang-of-four-wine": {
    en: "The Gang of Four",
    sv: "Gang of Four",
  },
};

function producerSlugFromHref(href: string): string | null {
  const match = href.match(/^\/(?:producers|producenter)\/([^/?#]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]).toLowerCase() : null;
}

function hrefSlugMatchesProducer(
  hrefSlug: string,
  nameSlugs: Set<string>,
): boolean {
  if (nameSlugs.has(hrefSlug)) return true;
  for (const slug of nameSlugs) {
    if (!slug) continue;
    if (hrefSlug === `domaine-${slug}`) return true;
    if (hrefSlug.endsWith(`-${slug}`)) return true;
  }
  return false;
}

function addGuide(
  map: Map<string, ProducerMentionedGuide>,
  href: string,
  title: string,
) {
  if (!href || !title.trim()) return;
  if (!map.has(href)) {
    map.set(href, { href, title: title.trim() });
  }
}

/**
 * Guides that mention a producer (by public profile slug) or their wines.
 * Built from static guide registries only — no invented copy.
 */
export function guidesMentioningProducer(
  producerSlug: string,
  locale: AppLocale,
  options?: {
    producerName?: string | null;
    displayName?: string | null;
    producerId?: string | null;
  },
): ProducerMentionedGuide[] {
  const slug = producerSlug.trim().toLowerCase();
  if (!slug) return [];

  const producerId = options?.producerId?.trim() || null;
  const names = new Set(
    [options?.producerName, options?.displayName]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  const nameSlugs = new Set(
    [...names].map((name) => generateProducerSlug(name)).filter(Boolean),
  );
  nameSlugs.add(slug);

  const top100Entry = TOP_100_PRODUCERS.find(
    (producer) =>
      (producerId != null && producer.producerId === producerId) ||
      names.has(producer.name) ||
      nameSlugs.has(generateProducerSlug(producer.name)),
  );
  if (top100Entry) {
    names.add(top100Entry.name);
    nameSlugs.add(generateProducerSlug(top100Entry.name));
  }

  const matchesProducer = (candidate: string | null | undefined) => {
    const value = candidate?.trim();
    if (!value) return false;
    if (names.has(value)) return true;
    return nameSlugs.has(generateProducerSlug(value));
  };

  const found = new Map<string, ProducerMentionedGuide>();
  const copy = guideCopy(locale);

  for (const guide of ALL_PRODUCER_GUIDES) {
    const linkedByRank =
      top100Entry != null &&
      guide.rank != null &&
      guide.rank === top100Entry.rank;
    if (
      linkedByRank ||
      guide.slug === slug ||
      matchesProducer(guide.name.en) ||
      matchesProducer(guide.name.sv)
    ) {
      addGuide(
        found,
        producerGuidePath(guide.slug, locale),
        guide.name[locale],
      );
    }
  }

  if (top100Entry || TOP_100_PRODUCERS.some((producer) => matchesProducer(producer.name))) {
    addGuide(found, guidePath("producers", locale), copy.producers.h1);
  }

  if (
    TOP_100_WINES.some(
      (wine) =>
        matchesProducer(wine.producer) ||
        matchesProducer(wine.topProducerName) ||
        (top100Entry != null && wine.topProducerName === top100Entry.name),
    )
  ) {
    addGuide(found, guidePath("wines", locale), copy.wines.h1);
  }

  if (
    TOP_100_WINES.some(
      (wine) =>
        wine.type.toLowerCase().includes("orange") &&
        (matchesProducer(wine.producer) ||
          matchesProducer(wine.topProducerName) ||
          (top100Entry != null && wine.topProducerName === top100Entry.name)),
    )
  ) {
    addGuide(
      found,
      guidePath("orangeWines", locale),
      locale === "sv"
        ? "Världens bästa orange viner"
        : "The world's best orange wines",
    );
  }

  for (const group of naturalVsOrganicProducerGroups) {
    if (
      group.producers.some((producer) => {
        const hrefSlug = producerSlugFromHref(producer.href);
        return (
          (hrefSlug != null && hrefSlugMatchesProducer(hrefSlug, nameSlugs)) ||
          matchesProducer(producer.name)
        );
      })
    ) {
      if (locale === "en") {
        addGuide(
          found,
          NATURAL_VS_ORGANIC_PATH,
          "Natural vs organic vs biodynamic wine",
        );
      }
      break;
    }
  }

  for (const [path, entry] of Object.entries(GUIDE_SHOP_LINKS)) {
    if (entry === "NONE") continue;
    const hitsProducer = entry.some((link) => {
      const hrefSlug = producerSlugFromHref(link.href);
      return (
        hrefSlug != null && hrefSlugMatchesProducer(hrefSlug, nameSlugs)
      );
    });
    if (!hitsProducer) continue;

    const isSv = path.startsWith("/guider");
    if ((locale === "sv") !== isSv) continue;

    const known = GUIDE_PATH_TITLES[path]?.[locale];
    const title =
      known ||
      (path === GUIDE_PATHS.producers.en || path === GUIDE_PATHS.producers.sv
        ? copy.producers.h1
        : path === GUIDE_PATHS.wines.en || path === GUIDE_PATHS.wines.sv
          ? copy.wines.h1
          : ALL_PRODUCER_GUIDES.find(
              (guide) =>
                producerGuidePath(guide.slug, locale) === path,
            )?.name[locale]) ||
      path.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ||
      path;

    addGuide(found, path, title);
  }

  return [...found.values()].sort((a, b) =>
    a.title.localeCompare(b.title, locale === "sv" ? "sv" : "en"),
  );
}
