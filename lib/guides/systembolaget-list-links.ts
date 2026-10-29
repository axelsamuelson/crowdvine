import type { AppLocale } from "@/lib/i18n/locale";
import { bestPetNatWinesSystembolagetArticle } from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import { newNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/new-natural-wines-systembolaget";
import { articlePath, isGuideArticlePublished } from "@/lib/guides/guide-types";
import type { GuideWineCategory } from "@/lib/systembolaget/guide-wines";

/** Up-link under the h1 on each of the seven style lists. */
export const SYSTEMBOLAGET_BEST_UPLINK = {
  prefix: {
    en: "See all: ",
    sv: "Se alla: ",
  },
  anchor: {
    en: "Natural wine at Systembolaget: the best 2026",
    sv: "Naturvin på Systembolaget: de bästa 2026",
  },
} as const;

/** Heading for the style-list links on the parent page. */
export const SYSTEMBOLAGET_BY_STYLE_HEADING = {
  en: "By colour and style",
  sv: "Efter färg och stil",
} as const;

/** Parent list first, then the style lists. Shared for index + cross-links. */
export const SYSTEMBOLAGET_RANKED_LISTS = [
  {
    category: "best" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-natural-wines-systembolaget",
      sv: "/guider/basta-naturvinerna-pa-systembolaget",
    },
    label: {
      en: "Natural wine at Systembolaget: the best 2026 →",
      sv: "Naturvin på Systembolaget: de bästa 2026 →",
    },
    h1: {
      en: "Natural wine at Systembolaget: the best 2026",
      sv: "Naturvin på Systembolaget: de bästa 2026",
    },
  },
  {
    category: "red" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-red-natural-wines-systembolaget",
      sv: "/guider/basta-roda-naturviner-systembolaget",
    },
    label: {
      en: "Best red natural wines at Systembolaget 2026 →",
      sv: "Bästa röda naturviner på Systembolaget 2026 →",
    },
    h1: {
      en: "Best red natural wines at Systembolaget 2026",
      sv: "Bästa röda naturviner på Systembolaget 2026",
    },
  },
  {
    category: "white" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-white-natural-wines-systembolaget",
      sv: "/guider/basta-vita-naturviner-systembolaget",
    },
    label: {
      en: "Best white natural wines at Systembolaget 2026 →",
      sv: "Bästa vita naturviner på Systembolaget 2026 →",
    },
    h1: {
      en: "Best white natural wines at Systembolaget 2026",
      sv: "Bästa vita naturviner på Systembolaget 2026",
    },
  },
  {
    category: "orange" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-orange-natural-wines-systembolaget",
      sv: "/guider/basta-orange-naturviner-systembolaget",
    },
    label: {
      en: "Best orange natural wines at Systembolaget →",
      sv: "Bästa orange naturviner på Systembolaget →",
    },
    h1: {
      en: "Best orange natural wines at Systembolaget 2026",
      sv: "Bästa orange naturviner på Systembolaget 2026",
    },
  },
  {
    category: "sparkling" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-sparkling-natural-wines-systembolaget",
      sv: "/guider/basta-mousserande-naturviner-systembolaget",
    },
    label: {
      en: "Best sparkling natural wines at Systembolaget →",
      sv: "Bästa mousserande naturviner på Systembolaget →",
    },
    h1: {
      en: "The best sparkling natural wines at Systembolaget",
      sv: "Bästa mousserande naturviner på Systembolaget",
    },
  },
  {
    category: "rose" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-rose-natural-wines-systembolaget",
      sv: "/guider/basta-rose-naturviner-systembolaget",
    },
    label: {
      en: "Best rosé natural wines at Systembolaget →",
      sv: "Bästa rosé naturviner på Systembolaget →",
    },
    h1: {
      en: "The best rosé natural wines at Systembolaget",
      sv: "Bästa rosé naturviner på Systembolaget",
    },
  },
  {
    category: "budget" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-natural-wines-under-200-systembolaget",
      sv: "/guider/basta-naturviner-under-200kr-systembolaget",
    },
    label: {
      en: "Best natural wines under 200 kr at Systembolaget →",
      sv: "Bästa naturvinerna under 200 kr på Systembolaget →",
    },
    h1: {
      en: "Best natural wines under 200 at Systembolaget 2026",
      sv: "Bästa naturvinerna under 200 kr på Systembolaget 2026",
    },
  },
  {
    category: "glouglou" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-glou-glou-wines-systembolaget",
      sv: "/guider/basta-glouglou-viner-systembolaget",
    },
    label: {
      en: "Best glou-glou wines at Systembolaget →",
      sv: "Bästa glou-glou-vinerna på Systembolaget →",
    },
    h1: {
      en: "Best glou-glou wines at Systembolaget 2026",
      sv: "Bästa glou-glou-vinerna på Systembolaget 2026",
    },
  },
  {
    category: "petnat" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-pet-nat-systembolaget",
      sv: "/guider/basta-pet-nat-systembolaget",
    },
    label: {
      en: "Best pet nat at Systembolaget →",
      sv: "Bästa pet nat på Systembolaget →",
    },
    h1: {
      en: "Best pet nat at Systembolaget 2026",
      sv: "Bästa pet nat på Systembolaget 2026",
    },
  },
] as const;

/**
 * Unpublished lists stay out of live cross-links. The article `published`
 * flag is the switch: hub, sitemap and these links follow it together.
 */
const RANKED_LIST_ARTICLES: Partial<
  Record<GuideWineCategory, { published?: boolean }>
> = {
  petnat: bestPetNatWinesSystembolagetArticle,
};

export function isSystembolagetRankedListPublic(list: {
  category: GuideWineCategory;
}): boolean {
  const article = RANKED_LIST_ARTICLES[list.category];
  if (!article) return true;
  return isGuideArticlePublished(article);
}

export function publicSystembolagetRankedLists(): SystembolagetRankedList[] {
  return SYSTEMBOLAGET_RANKED_LISTS.filter(isSystembolagetRankedListPublic);
}

export type SystembolagetRankedList = (typeof SYSTEMBOLAGET_RANKED_LISTS)[number];

/** Sibling lists for the current category (same locale). */
export function siblingSystembolagetLists(
  category: GuideWineCategory,
): SystembolagetRankedList[] {
  return publicSystembolagetRankedLists().filter(
    (list) => list.category !== category,
  );
}

export function systembolagetListHref(
  list: SystembolagetRankedList,
  locale: AppLocale,
): string {
  return list.href[locale];
}

export function systembolagetListLabel(
  list: SystembolagetRankedList,
  locale: AppLocale,
): string {
  return list.label[locale];
}

/** Accessible name for the guide switcher on every Systembolaget list. */
export const SYSTEMBOLAGET_GUIDE_NAV_LABEL = {
  sv: "Systembolaget-guider",
  en: "Systembolaget guides",
} as const;

/**
 * Short chip labels. Overview guides first, then colour and style,
 * so the first screen on a phone shows Bästa and Nya without scrolling.
 */
const SYSTEMBOLAGET_GUIDE_NAV_SHORT: Record<
  GuideWineCategory,
  { readonly en: string; readonly sv: string }
> = {
  best: { sv: "Bästa", en: "Best" },
  new: { sv: "Nya", en: "New" },
  red: { sv: "Röda", en: "Red" },
  white: { sv: "Vita", en: "White" },
  orange: { sv: "Orange", en: "Orange" },
  sparkling: { sv: "Mousserande", en: "Sparkling" },
  rose: { sv: "Rosé", en: "Rosé" },
  budget: { sv: "Under 200 kr", en: "Under 200" },
  glouglou: { sv: "Glou-glou", en: "Glou-glou" },
  petnat: { sv: "Pet nat", en: "Pet nat" },
};

const SYSTEMBOLAGET_GUIDE_NAV_ORDER = [
  "best",
  "new",
  "red",
  "white",
  "orange",
  "sparkling",
  "rose",
  "budget",
  "glouglou",
  "petnat",
] as const satisfies readonly GuideWineCategory[];

export type SystembolagetGuideNavItem = {
  category: GuideWineCategory;
  href: string;
  short: string;
  /** Full guide name for the accessible link name. */
  name: string;
};

/** Published Systembolaget guides for the in-page switcher. */
export function systembolagetGuideNavItems(
  locale: AppLocale,
): SystembolagetGuideNavItem[] {
  const byCategory = new Map<GuideWineCategory, SystembolagetGuideNavItem>();

  for (const list of publicSystembolagetRankedLists()) {
    byCategory.set(list.category, {
      category: list.category,
      href: list.href[locale],
      short: SYSTEMBOLAGET_GUIDE_NAV_SHORT[list.category][locale],
      name: list.h1[locale],
    });
  }

  if (isGuideArticlePublished(newNaturalWinesSystembolagetArticle)) {
    byCategory.set("new", {
      category: "new",
      href: articlePath(newNaturalWinesSystembolagetArticle, locale),
      short: SYSTEMBOLAGET_GUIDE_NAV_SHORT.new[locale],
      name: newNaturalWinesSystembolagetArticle.h1[locale],
    });
  }

  return SYSTEMBOLAGET_GUIDE_NAV_ORDER.flatMap((category) => {
    const item = byCategory.get(category);
    return item ? [item] : [];
  });
}
