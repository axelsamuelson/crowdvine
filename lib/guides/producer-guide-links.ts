import type { AppLocale } from "@/lib/i18n/locale";

/**
 * Baseline Google positions, 14 Sep to 11 Oct 2026, recorded 12 Oct 2026
 * so the effect of this guide link graph can be measured:
 * SV Overnoy 40.8, SV Jura 37.5, SV Beaujolais 28.9, SV Ganevat 27.4.
 */

export type ProducerGuideLink = {
  slug: string;
  /** Set when the producer is a row on the top-100 list. */
  rank?: number;
  name: { en: string; sv: string };
};

/** All 11 producer guides, rank order, then the two guides with no rank row. */
export const ALL_PRODUCER_GUIDES: readonly ProducerGuideLink[] = [
  { slug: "pierre-overnoy", rank: 1, name: { en: "Pierre Overnoy", sv: "Pierre Overnoy" } },
  { slug: "thierry-allemand", rank: 2, name: { en: "Thierry Allemand", sv: "Thierry Allemand" } },
  { slug: "josko-gravner", rank: 3, name: { en: "Joško Gravner", sv: "Joško Gravner" } },
  {
    slug: "jean-francois-ganevat",
    rank: 4,
    name: { en: "Jean-François Ganevat", sv: "Jean-François Ganevat" },
  },
  { slug: "jacques-selosse", rank: 5, name: { en: "Jacques Selosse", sv: "Jacques Selosse" } },
  { slug: "radikon", rank: 8, name: { en: "Radikon", sv: "Radikon" } },
  { slug: "jean-foillard", rank: 10, name: { en: "Jean Foillard", sv: "Jean Foillard" } },
  { slug: "marcel-lapierre", rank: 12, name: { en: "Marcel Lapierre", sv: "Marcel Lapierre" } },
  { slug: "guy-breton", rank: 29, name: { en: "Guy Breton", sv: "Guy Breton" } },
  {
    slug: "jean-paul-thevenet",
    name: { en: "Jean-Paul Thévenet", sv: "Jean-Paul Thévenet" },
  },
  {
    slug: "gang-of-four-wine",
    name: { en: "The Gang of Four", sv: "Gang of Four" },
  },
];

export function producerGuidePath(slug: string, locale: AppLocale): string {
  const prefix = locale === "sv" ? "/guider" : "/guides";
  return `${prefix}/${slug}`;
}

export function producerGuideHref(
  rank: number,
  locale: AppLocale,
): string | undefined {
  const guide = ALL_PRODUCER_GUIDES.find((entry) => entry.rank === rank);
  if (!guide) return undefined;
  return producerGuidePath(guide.slug, locale);
}

const BLURB_MENTION = /Thévenet|Gang of Four/g;

export type ProducerBlurbPart = {
  text: string;
  href?: string;
};

/** Link the plain-text mentions in a producer-list blurb. Anchor text stays the mention. */
export function splitProducerBlurbMentions(
  text: string,
  locale: AppLocale,
): ProducerBlurbPart[] {
  const parts: ProducerBlurbPart[] = [];
  const re = new RegExp(BLURB_MENTION.source, "g");
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index) });
    }
    const phrase = match[0];
    const slug =
      phrase === "Thévenet" ? "jean-paul-thevenet" : "gang-of-four-wine";
    parts.push({ text: phrase, href: producerGuidePath(slug, locale) });
    last = match.index + phrase.length;
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last) });
  }
  if (parts.length === 0) {
    parts.push({ text });
  }
  return parts;
}
