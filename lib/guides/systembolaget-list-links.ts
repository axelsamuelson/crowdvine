import type { AppLocale } from "@/lib/i18n/locale";
import type { GuideWineCategory } from "@/lib/systembolaget/guide-wines";

/** All six ranked Systembolaget list pages — shared for index + cross-links. */
export const SYSTEMBOLAGET_RANKED_LISTS = [
  {
    category: "red" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-red-natural-wines-systembolaget",
      sv: "/guider/basta-roda-naturviner-systembolaget",
    },
    label: {
      en: "Best red natural wines at Systembolaget →",
      sv: "Bästa röda naturviner på Systembolaget →",
    },
  },
  {
    category: "white" as const satisfies GuideWineCategory,
    href: {
      en: "/guides/best-white-natural-wines-systembolaget",
      sv: "/guider/basta-vita-naturviner-systembolaget",
    },
    label: {
      en: "Best white natural wines at Systembolaget →",
      sv: "Bästa vita naturviner på Systembolaget →",
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
