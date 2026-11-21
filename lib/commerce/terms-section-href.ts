import type { AppLocale } from "@/lib/i18n/locale";

/** Stable anchors on /villkor and /terms (LegalH2 ids). */
export const TERMS_SECTION_SELLER_ID = "punkt-1";
export const TERMS_SECTION_WITHDRAWAL_ID = "punkt-9";

export function termsPath(locale: AppLocale): string {
  return locale === "en" ? "/terms" : "/villkor";
}

export function termsSectionHref(
  locale: AppLocale,
  sectionId: string,
): string {
  return `${termsPath(locale)}#${sectionId}`;
}
