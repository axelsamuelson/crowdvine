/**
 * Editorial review date for wine region landing pages.
 * Visible byline + WebPage `dateModified` share this ISO date.
 */
export const WINE_REGION_PAGE_REVIEWED_AT = "2026-11-02";

const MONTHS = {
  sv: [
    "januari",
    "februari",
    "mars",
    "april",
    "maj",
    "juni",
    "juli",
    "augusti",
    "september",
    "oktober",
    "november",
    "december",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
} as const;

/** Display form for byline, e.g. "2 november 2026" / "2 November 2026". */
export function formatWineRegionReviewedDate(locale: "sv" | "en"): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(WINE_REGION_PAGE_REVIEWED_AT);
  if (!match) return WINE_REGION_PAGE_REVIEWED_AT;
  const month = MONTHS[locale][Number(match[2]) - 1];
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function wineRegionReviewedByline(locale: "sv" | "en"): string {
  const date = formatWineRegionReviewedDate(locale);
  return locale === "sv"
    ? `Senast granskad ${date}`
    : `Last reviewed ${date}`;
}
