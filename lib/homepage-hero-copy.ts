export type HomepageHeroCopy = {
  /** H1 lines (from CMS newlines or i18n before/middle fallback). */
  titleLines: string[];
  subtitle: string;
  description1: string | null;
  description2: string | null;
};

/** CMS keys for homepage copy. Base = EN, `_sv` = Swedish. */
export const HOMEPAGE_HERO_COPY_FIELDS = [
  {
    key: "homepage_hero_title",
    keySv: "homepage_hero_title_sv",
    label: "Hero title",
    description:
      "Main headline on the homepage hero. Use a new line for a second line in the H1.",
    multiline: true,
  },
  {
    key: "homepage_hero_subtitle",
    keySv: "homepage_hero_subtitle_sv",
    label: "Hero subtitle",
    description: "Supporting text under the headline on the homepage hero.",
    multiline: true,
  },
  {
    key: "homepage_hero_description_1",
    keySv: "homepage_hero_description_1_sv",
    label: "Sidebar line 1",
    description: "Extra line in the desktop homepage sidebar under the title.",
    multiline: false,
  },
  {
    key: "homepage_hero_description_2",
    keySv: "homepage_hero_description_2_sv",
    label: "Sidebar line 2",
    description: "Second extra line in the desktop homepage sidebar.",
    multiline: false,
  },
] as const;
