import type { AppLocale } from "@/lib/i18n/locale";
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

/** Parent list first, then the seven style lists. Shared for index + cross-links. */
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
] as const;

export type SystembolagetRankedList = (typeof SYSTEMBOLAGET_RANKED_LISTS)[number];

/** Sibling lists for the current category (same locale). */
export function siblingSystembolagetLists(
  category: GuideWineCategory,
): SystembolagetRankedList[] {
  return SYSTEMBOLAGET_RANKED_LISTS.filter((list) => list.category !== category);
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
