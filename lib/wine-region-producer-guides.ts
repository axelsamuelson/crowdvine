/**
 * Producer guide articles that belong to a wine region landing page.
 * Links are editorial (guides), not gated on live catalog membership.
 */

import {
  ALL_PRODUCER_GUIDES,
  producerGuidePath,
  type ProducerGuideLink,
} from "@/lib/guides/producer-guide-links";
import type { AppLocale } from "@/lib/i18n/locale";
import { generateProducerSlug } from "@/lib/producer-handle";
import type { WineRegionSlug } from "@/lib/wine-regions";

/** Guide slugs owned by each region (French allowlist). */
const REGION_PRODUCER_GUIDE_SLUGS: Partial<
  Record<WineRegionSlug, readonly string[]>
> = {
  jura: ["pierre-overnoy", "jean-francois-ganevat"],
  beaujolais: [
    "jean-foillard",
    "marcel-lapierre",
    "guy-breton",
    "jean-paul-thevenet",
    "gang-of-four-wine",
  ],
  champagne: ["jacques-selosse"],
  rhone: ["thierry-allemand"],
};

export function getWineRegionProducerGuides(
  slug: WineRegionSlug,
): ProducerGuideLink[] {
  const slugs = REGION_PRODUCER_GUIDE_SLUGS[slug];
  if (!slugs?.length) return [];
  const bySlug = new Map(ALL_PRODUCER_GUIDES.map((g) => [g.slug, g]));
  return slugs
    .map((guideSlug) => bySlug.get(guideSlug))
    .filter((g): g is ProducerGuideLink => g != null);
}

export function getWineRegionProducerGuideLinks(
  slug: WineRegionSlug,
  locale: AppLocale,
): Array<{ name: string; href: string }> {
  return getWineRegionProducerGuides(slug).map((guide) => ({
    name: guide.name[locale],
    href: producerGuidePath(guide.slug, locale),
  }));
}

/**
 * Resolve a producer-guide href for a live producer name when a matching
 * guide exists (slug or localized name).
 */
export function findProducerGuideHrefForName(
  producerName: string,
  locale: AppLocale,
): string | null {
  const trimmed = producerName.trim();
  if (!trimmed) return null;
  const nameSlug = generateProducerSlug(trimmed);
  const match = ALL_PRODUCER_GUIDES.find((guide) => {
    if (guide.slug === nameSlug) return true;
    const enSlug = generateProducerSlug(guide.name.en);
    const svSlug = generateProducerSlug(guide.name.sv);
    return enSlug === nameSlug || svSlug === nameSlug;
  });
  return match ? producerGuidePath(match.slug, locale) : null;
}
