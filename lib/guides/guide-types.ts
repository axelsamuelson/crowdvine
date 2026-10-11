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
   * Ignored when `blocks` is set.
   */
  body: {
    en: string | string[];
    sv: string | string[];
  };
  /**
   * Paragraphs and lists, in order. When set, rendered instead of `body`.
   */
  blocks?: GuideArticleBlock[];
};

export type GuideArticleBlock =
  | {
      type: "paragraphs";
      body: GuideArticleSection["body"];
    }
  | {
      type: "list";
      /** Bold label rendered immediately before the list. */
      label?: LocalizedString;
      ordered?: boolean;
      items: {
        en: string[];
        sv: string[];
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

export type GuideArticleFaq = {
  question: LocalizedString;
  answer: LocalizedString;
};

/**
 * Dual-locale article guide content.
 * Paths: `/guides/{slug.en}` and `/guider/{slug.sv}`.
 */
export type GuideArticleContent = {
  /**
   * Unpublished guides stay on the direct URL (200) but are noindex,nofollow,
   * left out of the sitemap and the guide hub, and dropped from other
   * articles' further-reading links. Omit or set true to publish.
   * Read only via `isGuideArticlePublished`.
   */
  published?: boolean;
  /**
   * Cave Pur Jus on the Sweden online-buying guide.
   * Read in that content file when the section list and Sources are built.
   * False or omitted omits the section and its source link.
   */
  includePurJus?: boolean;
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
  /** Optional FAQ block + FAQPage JSON-LD (e.g. Systembolaget guides). */
  faqs?: GuideArticleFaq[];
  internalLinks: GuideArticleInternalLink[];
  jsonLdAbout: GuideArticleJsonLdAbout;
  /**
   * End-of-article shop CTA.
   * undefined: /wine/natural-wine | /vin/naturvin (or first shop link in internalLinks).
   * null: no shop CTA and no fallback shop link.
   */
  shopCta?: {
    href: LocalizedString;
    label?: LocalizedString;
  } | null;
};

/** `published: false` hides a guide. Omitted means published. */
export function isGuideArticlePublished(content: {
  published?: boolean;
}): boolean {
  return content.published !== false;
}

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
