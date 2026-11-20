/**
 * Customer-facing delivery date from pallet columns. No date is invented.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type PalletDeliveryDates = {
  expected: string | null;
  start: string | null;
  end: string | null;
};

export function parseIsoDateOnly(
  value: string | null | undefined,
): Date | null {
  if (typeof value !== "string") return null;
  const match = ISO_DATE.exec(value.trim().slice(0, 10));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDay(date: Date, locale: "sv" | "en", withYear: boolean): string {
  return new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: withYear ? "numeric" : undefined,
  }).format(date);
}

/**
 * A window when both ends are set, otherwise a single date.
 * Returns null when none of the columns hold a real date.
 */
export function formatPalletDeliveryWhen(
  dates: PalletDeliveryDates,
  locale: "sv" | "en",
): string | null {
  const start = parseIsoDateOnly(dates.start);
  const end = parseIsoDateOnly(dates.end);
  const expected = parseIsoDateOnly(dates.expected);

  if (start && end) {
    const sameYear = start.getFullYear() === end.getFullYear();
    const startLabel = formatDay(start, locale, !sameYear);
    const endLabel = formatDay(end, locale, true);
    return `${startLabel}–${endLabel}`;
  }

  const single = expected ?? start ?? end;
  if (!single) return null;
  return formatDay(single, locale, true);
}
