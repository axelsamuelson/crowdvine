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

/** Article author for byline + Article JSON-LD `author` Person. */
export type GuideArticleAuthor = {
  name: string;
  /** Schema.org jobTitle, e.g. "Founder". */
  jobTitle?: string;
  /** Visible byline under the H1 (locale-specific). */
  byline: LocalizedString;
};

export type GuideArticleSection = {
  /**
   * When set, the section is rendered only for these locales.
   * Omit to show it in both languages.
   */
  locales?: readonly AppLocale[];
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

export type GuideArticleDefinitionItem = {
  term: LocalizedString;
  description: LocalizedString;
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
    }
  | {
      type: "heading";
      /** Default 3 — in-section subheads (wine names, etc.). */
      level?: 3;
      /** HTML id for in-page anchors. */
      id?: string;
      text: LocalizedString;
    }
  | {
      /**
       * Compact term/description pairs (e.g. wine fact block).
       * Rendered as a `<dl>`; layout may split columns by term.
       */
      type: "definitions";
      items: GuideArticleDefinitionItem[];
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
  /** When set, the question is rendered only for these locales. */
  locales?: readonly AppLocale[];
  question: LocalizedString;
  answer: LocalizedString;
};

export function articleVisibleForLocale<T extends { locales?: readonly AppLocale[] }>(
  items: readonly T[],
  locale: AppLocale,
): T[] {
  return items.filter((item) => !item.locales || item.locales.includes(locale));
}

/** Visible anchor from a markdown link, without the URL. */
export function articleLinkText(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1");
}

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
   * Sitemap `<lastmod>` and Article `dateModified` (YYYY-MM-DD).
   * Set only when the page copy actually changes.
   */
  updated?: string;
  /**
   * Cave Pur Jus on the Sweden online-buying guide.
   * Read in that content file when the section list and Sources are built.
   * False or omitted omits the section and its source link.
   */
  includePurJus?: boolean;
  slug: LocalizedString;
  /**
   * Document title is absolute for these locales, so the root layout
   * template does not append ` | PACT Wines`.
   */
  absoluteTitle?: Partial<Record<AppLocale, true>>;
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
   * When set, further reading may include a link to the region shop page
   * only if the shared linkability helper returns a href
   * (≥1 live wine). Never hard-code region page URLs in article copy.
   */
  wineRegionSlug?: string;
  /** Optional byline author; emitted as Article `author` Person JSON-LD. */
  author?: GuideArticleAuthor;
  /**
   * End-of-article shop CTA.
   * undefined: /wine | /vin (or first shop link in internalLinks).
   * null: no shop CTA and no fallback shop link.
   */
  shopCta?: {
    href: LocalizedString;
    label?: LocalizedString;
  } | null;
  /**
   * Optional ArticleGuideShell heading class overrides for a single guide.
   * Prefer this over changing shared `ARTICLE_GUIDE_H2_CLASS` / wine H3 defaults
   * (those are also used by ranked lists and releases pages).
   */
  shellHeadingClasses?: {
    sectionHeadingClassName?: string;
    wineHeadingClassName?: string;
  };
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
