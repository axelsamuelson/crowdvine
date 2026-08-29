import type { AppLocale } from "@/lib/i18n/locale";

export const GUIDE_PATHS = {
  hub: {
    sv: "/guider",
    en: "/guides",
  },
  wines: {
    sv: "/guider/varldens-basta-naturviner",
    en: "/guides/worlds-best-natural-wines",
  },
  producers: {
    sv: "/guider/varldens-basta-naturvinsproducenter",
    en: "/guides/worlds-best-natural-wine-producers",
  },
  orangeWines: {
    sv: "/guider/varldens-basta-orange-viner",
    en: "/guides/worlds-best-orange-wines",
  },
  naturalChampagne: {
    sv: "/guider/varldens-basta-naturliga-champagne",
    en: "/guides/worlds-best-natural-champagne",
  },
} as const;

export function guidePath(
  key: keyof typeof GUIDE_PATHS,
  locale: AppLocale,
): string {
  return GUIDE_PATHS[key][locale];
}

export function guideHreflang(key: keyof typeof GUIDE_PATHS, baseUrl: string) {
  const sv = `${baseUrl}${GUIDE_PATHS[key].sv}`;
  const en = `${baseUrl}${GUIDE_PATHS[key].en}`;
  return {
    sv,
    en,
    "x-default": sv,
  } as const;
}
