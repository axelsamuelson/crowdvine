import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/locale";

export type HomepageHeroCopy = {
  /** H1 lines (from CMS newlines or i18n before/middle fallback). */
  titleLines: string[];
  subtitle: string;
  description1: string | null;
  description2: string | null;
};

export type HomepageHeroCopyDefaults = {
  title: string;
  subtitle: string;
  description1: string;
  description2: string;
};

/** CMS keys for homepage copy. Base = EN, `_sv` = Swedish. */
export const HOMEPAGE_HERO_COPY_FIELDS = [
  {
    key: "homepage_hero_title",
    keySv: "homepage_hero_title_sv",
    defaultKey: "title",
    label: "Hero title",
    description:
      "Main headline on the homepage hero. Use a new line for a second line in the H1.",
    multiline: true,
  },
  {
    key: "homepage_hero_subtitle",
    keySv: "homepage_hero_subtitle_sv",
    defaultKey: "subtitle",
    label: "Hero subtitle",
    description: "Supporting text under the headline on the homepage hero.",
    multiline: true,
  },
  {
    key: "homepage_hero_description_1",
    keySv: "homepage_hero_description_1_sv",
    defaultKey: "description1",
    label: "Sidebar line 1",
    description: "Extra line in the desktop homepage sidebar under the title.",
    multiline: false,
  },
  {
    key: "homepage_hero_description_2",
    keySv: "homepage_hero_description_2_sv",
    defaultKey: "description2",
    label: "Sidebar line 2",
    description: "Second extra line in the desktop homepage sidebar.",
    multiline: false,
  },
] as const;

export type HomepageHeroCopyField = (typeof HOMEPAGE_HERO_COPY_FIELDS)[number];
export type HomepageHeroCopyDefaultKey = HomepageHeroCopyField["defaultKey"];

/** Message-file defaults used when CMS is empty or SV accidentally holds EN copy. */
export function homepageHeroCopyDefaults(
  locale: AppLocale,
): HomepageHeroCopyDefaults {
  return {
    title: translate(locale, "home.heroTitle"),
    subtitle: translate(locale, "home.heroSubtitle"),
    description1: translate(locale, "home.heroDescription1"),
    description2: translate(locale, "home.heroDescription2"),
  };
}

export function homepageHeroDefaultForField(
  locale: AppLocale,
  defaultKey: HomepageHeroCopyDefaultKey,
): string {
  return homepageHeroCopyDefaults(locale)[defaultKey];
}

/** True when a Swedish CMS value is blank or clearly English leakage. */
export function isUnusableSwedishHeroValue(
  svValue: string | null | undefined,
  enValue: string | null | undefined,
): boolean {
  const sv = svValue?.trim() ?? "";
  if (!sv) return true;
  const en = enValue?.trim() ?? "";
  if (en && sv.toLowerCase() === en.toLowerCase()) return true;
  // Known English hero tagline that used to ship as the SV fallback.
  if (/wine\s+without/i.test(sv) || /the\s+middlemen/i.test(sv)) return true;
  return false;
}

export function allHomepageHeroCopyKeys(): string[] {
  return HOMEPAGE_HERO_COPY_FIELDS.flatMap((field) => [field.key, field.keySv]);
}
