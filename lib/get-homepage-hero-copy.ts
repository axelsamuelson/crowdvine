import { getSiteContentByKey } from "@/lib/actions/content";
import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/locale";
import type { HomepageHeroCopy } from "@/lib/homepage-hero-copy";

async function resolveHeroLine(
  locale: AppLocale,
  baseKey: string,
  messageKey: string,
): Promise<string | null> {
  if (locale === "sv") {
    const sv = await getSiteContentByKey(`${baseKey}_sv`);
    if (sv?.trim()) return sv.trim();
    return translate(locale, messageKey);
  }
  const en = await getSiteContentByKey(baseKey);
  if (en?.trim()) return en.trim();
  return translate(locale, messageKey);
}

function splitTitleLines(title: string): string[] {
  return title
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function fallbackTitleLines(locale: AppLocale): string[] {
  const before = translate(locale, "home.heroTitleBefore").trim();
  const middle = translate(locale, "home.heroTitleMiddle").trim();
  return [before, middle].filter(Boolean);
}

/** Resolve homepage hero + sidebar copy for the active locale. */
export async function getHomepageHeroCopy(
  locale: AppLocale,
): Promise<HomepageHeroCopy> {
  const [titleRaw, subtitle, description1, description2] = await Promise.all([
    resolveHeroLine(locale, "homepage_hero_title", "home.heroTitle"),
    resolveHeroLine(locale, "homepage_hero_subtitle", "home.heroSubtitle"),
    resolveHeroLine(
      locale,
      "homepage_hero_description_1",
      "home.heroDescription1",
    ),
    resolveHeroLine(
      locale,
      "homepage_hero_description_2",
      "home.heroDescription2",
    ),
  ]);

  const titleLines = titleRaw
    ? splitTitleLines(titleRaw)
    : fallbackTitleLines(locale);

  const resolvedTitleLines =
    titleLines.length > 0 ? titleLines : fallbackTitleLines(locale);

  return {
    titleLines: resolvedTitleLines,
    subtitle: subtitle?.trim() || "",
    description1: description1?.trim() || null,
    description2: description2?.trim() || null,
  };
}
