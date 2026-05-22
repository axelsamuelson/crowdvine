import { getSiteContentByKey } from "@/lib/actions/content";
import type { AppLocale } from "@/lib/i18n/locale";

/** Resolve CMS key for locale (`homepage_hero_title_sv` → `homepage_hero_title` → null). */
export async function getLocalizedSiteContent(
  baseKey: string,
  locale: AppLocale,
): Promise<string | null> {
  if (locale === "sv") {
    const sv = await getSiteContentByKey(`${baseKey}_sv`);
    if (sv) return sv;
  }
  return getSiteContentByKey(baseKey);
}
