import type { AppLocale } from "@/lib/i18n/locale";

/** Locale-keyed string used throughout bilingual guide articles. */
export type LocalizedString = {
  en: string;
  sv: string;
};

export type GuideArticleJsonLdAbout = {
  type: "Person" | "Place" | "Thing";
  name: string;
  jobTitle?: string;
};

export type GuideArticleSection = {
  heading?: LocalizedString;
  /** Subtle muted badge next to the heading (e.g. rank movement). */
  headingBadge?: LocalizedString;
  /**
   * Body copy for the section. Each locale may be a `\n\n`-separated
   * string or an array of paragraphs.
   */
  body: {
    en: string | string[];
    sv: string | string[];
  };
};

export type GuideArticleInternalLink = {
  label: LocalizedString;
  href: LocalizedString;
};

export type GuideArticleHubCard = {
  title: LocalizedString;
  description: LocalizedString;
};

/**
 * Dual-locale article guide content.
 * Paths: `/guides/{slug.en}` and `/guider/{slug.sv}`.
 */
export type GuideArticleContent = {
  slug: LocalizedString;
  title: LocalizedString;
  meta: LocalizedString;
  h1: LocalizedString;
  /** Optional deck under the H1; falls back to hubCard.description when omitted. */
  lede?: LocalizedString;
  breadcrumbShort: LocalizedString;
  furtherReadingHeading: LocalizedString;
  hubCard: GuideArticleHubCard;
  sections: GuideArticleSection[];
  internalLinks: GuideArticleInternalLink[];
  jsonLdAbout: GuideArticleJsonLdAbout;
};

export function articlePath(
  content: GuideArticleContent,
  locale: AppLocale,
): string {
  const prefix = locale === "sv" ? "/guider" : "/guides";
  return `${prefix}/${content.slug[locale]}`;
}

export function articleParagraphs(
  body: GuideArticleSection["body"],
  locale: AppLocale,
): string[] {
  const value = body[locale];
  if (Array.isArray(value)) {
    return value.filter((p) => p.trim().length > 0);
  }
  return value
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function articleHubCard(
  content: GuideArticleContent,
  locale: AppLocale,
): { href: string; title: string; description: string } {
  return {
    href: articlePath(content, locale),
    title: content.hubCard.title[locale],
    description: content.hubCard.description[locale],
  };
}
