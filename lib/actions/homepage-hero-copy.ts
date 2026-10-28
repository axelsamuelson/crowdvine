"use server";

import { getSiteContentByKey, updateSiteContent } from "@/lib/actions/content";
import type { AppLocale } from "@/lib/i18n/locale";
import {
  HOMEPAGE_HERO_COPY_FIELDS,
  homepageHeroCopyDefaults,
  homepageHeroDefaultForField,
  isUnusableSwedishHeroValue,
} from "@/lib/homepage-hero-copy";

/**
 * Write message-file defaults into site_content for empty keys, and replace
 * Swedish values that are blank or identical to the English CMS value.
 * Safe to call from admin — does not overwrite intentional SV/EN copy.
 */
export async function ensureHomepageHeroCopyDefaults(): Promise<{
  written: string[];
}> {
  const written: string[] = [];
  const enDefaults = homepageHeroCopyDefaults("en");
  const svDefaults = homepageHeroCopyDefaults("sv");

  for (const field of HOMEPAGE_HERO_COPY_FIELDS) {
    const enExisting = await getSiteContentByKey(field.key);
    const enValue = enExisting?.trim()
      ? enExisting.trim()
      : enDefaults[field.defaultKey];
    if (!enExisting?.trim()) {
      await updateSiteContent(field.key, enValue);
      written.push(field.key);
    }

    const svExisting = await getSiteContentByKey(field.keySv);
    if (isUnusableSwedishHeroValue(svExisting, enValue)) {
      const svValue = svDefaults[field.defaultKey];
      await updateSiteContent(field.keySv, svValue);
      written.push(field.keySv);
    }
  }

  return { written };
}

/** Force one CMS key back to the locale message default. */
export async function resetHomepageHeroCopyField(
  key: string,
  locale: AppLocale,
): Promise<string> {
  const field = HOMEPAGE_HERO_COPY_FIELDS.find(
    (row) => row.key === key || row.keySv === key,
  );
  if (!field) {
    throw new Error(`Unknown homepage hero copy key: ${key}`);
  }
  const expectedKey = locale === "sv" ? field.keySv : field.key;
  if (key !== expectedKey) {
    throw new Error(`Key ${key} does not match locale ${locale}`);
  }
  const value = homepageHeroDefaultForField(locale, field.defaultKey);
  await updateSiteContent(key, value);
  return value;
}
