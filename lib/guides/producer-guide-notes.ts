import type { AppLocale } from "@/lib/i18n/locale";
import { GUIDE_PATHS } from "@/lib/guides/guide-routes";

/** Optional contextual notes linking producer profiles → top-100 guide. */
export type ProducerGuideNote = {
  beforeLink: string;
  linkLabel: string;
  href: string;
};

const PRODUCER_GUIDE_NOTES: Record<
  string,
  Record<AppLocale, ProducerGuideNote>
> = {
  "hors-saison": {
    sv: {
      beforeLink: "Granne med Axel Prüfer — #38 på vår lista över ",
      linkLabel: "världens 100 bästa naturvinsproducenter →",
      href: GUIDE_PATHS.producers.sv,
    },
    en: {
      beforeLink: "Neighbour to Axel Prüfer — #38 on our list of the ",
      linkLabel: "world's 100 best natural wine producers →",
      href: GUIDE_PATHS.producers.en,
    },
  },
  "le-bouc-a-trois-pattes": {
    sv: {
      beforeLink: "Granne med Axel Prüfer — #38 på vår lista över ",
      linkLabel: "världens 100 bästa naturvinsproducenter →",
      href: GUIDE_PATHS.producers.sv,
    },
    en: {
      beforeLink: "Neighbour to Axel Prüfer — #38 on our list of the ",
      linkLabel: "world's 100 best natural wine producers →",
      href: GUIDE_PATHS.producers.en,
    },
  },
  "yannick-pelletier": {
    sv: {
      beforeLink: "Upplärd av Didier Barral — #71 på vår lista över ",
      linkLabel: "världens 100 bästa naturvinsproducenter →",
      href: GUIDE_PATHS.producers.sv,
    },
    en: {
      beforeLink: "Taught by Didier Barral — #71 on our list of the ",
      linkLabel: "world's 100 best natural wine producers →",
      href: GUIDE_PATHS.producers.en,
    },
  },
};

export function getProducerGuideNote(
  slug: string,
  locale: AppLocale = "sv",
): ProducerGuideNote | null {
  return PRODUCER_GUIDE_NOTES[slug.trim().toLowerCase()]?.[locale] ?? null;
}
