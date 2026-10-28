const STOCKHOLM = "Europe/Stockholm";

export type ReleaseWine = {
  id: number;
  product_launch_date: string | null;
  wine_score: number | null;
  score_adjust: number;
  producer_name: string | null;
};

export type ReleaseDateGroup<T extends ReleaseWine> = {
  dateKey: string;
  wines: T[];
};

export type ReleaseCalendar<T extends ReleaseWine> = {
  upcoming: ReleaseDateGroup<T>[];
  released: ReleaseDateGroup<T>[];
};

/** Calendar date in Europe/Stockholm, YYYY-MM-DD. */
export function stockholmDateKey(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STOCKHOLM,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Launch instant as a Stockholm calendar date. Null when missing or unparseable. */
export function launchDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return stockholmDateKey(date);
}

function blendedScore(wine: ReleaseWine): number {
  return (wine.wine_score ?? 0) + wine.score_adjust;
}

function sortWithinDate<T extends ReleaseWine>(wines: readonly T[]): T[] {
  return [...wines].sort((a, b) => {
    const byScore = blendedScore(b) - blendedScore(a);
    if (byScore !== 0) return byScore;
    const byName = (a.producer_name ?? "").localeCompare(
      b.producer_name ?? "",
      "sv",
    );
    if (byName !== 0) return byName;
    return a.id - b.id;
  });
}

function groupByDate<T extends ReleaseWine>(
  wines: readonly T[],
  dateOrder: "asc" | "desc",
): ReleaseDateGroup<T>[] {
  const byDate = new Map<string, T[]>();
  for (const wine of wines) {
    const key = launchDateKey(wine.product_launch_date);
    if (!key) continue;
    const list = byDate.get(key) ?? [];
    list.push(wine);
    byDate.set(key, list);
  }
  const keys = [...byDate.keys()].sort((a, b) =>
    dateOrder === "asc" ? a.localeCompare(b) : b.localeCompare(a),
  );
  return keys.map((dateKey) => ({
    dateKey,
    wines: sortWithinDate(byDate.get(dateKey) ?? []),
  }));
}

/**
 * Split published release-calendar rows into upcoming and just-released groups.
 * Dates are Stockholm calendar dates. Rows older than 60 days, or without a
 * launch date, are omitted. Nothing is unpublished.
 */
export function groupReleaseWines<T extends ReleaseWine>(
  wines: readonly T[],
  now: Date,
): ReleaseCalendar<T> {
  const today = stockholmDateKey(now);
  const cutoff = addCalendarDays(today, -60);
  const upcoming: T[] = [];
  const released: T[] = [];

  for (const wine of wines) {
    const key = launchDateKey(wine.product_launch_date);
    if (!key) continue;
    if (key > today) upcoming.push(wine);
    else if (key >= cutoff && key <= today) released.push(wine);
  }

  return {
    upcoming: groupByDate(upcoming, "asc"),
    released: groupByDate(released, "desc"),
  };
}

function utcNoon(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function capitalize(value: string, locale: "en" | "sv"): string {
  if (!value) return value;
  const tag = locale === "sv" ? "sv-SE" : "en-GB";
  return value.charAt(0).toLocaleUpperCase(tag) + value.slice(1);
}

/** "Fredag 6 november" / "Friday 6 November". */
export function formatReleaseGroupHeading(
  dateKey: string,
  locale: "en" | "sv",
): string {
  const date = utcNoon(dateKey);
  const tag = locale === "sv" ? "sv-SE" : "en-GB";
  const weekday = new Intl.DateTimeFormat(tag, {
    timeZone: "UTC",
    weekday: "long",
  }).format(date);
  const month = new Intl.DateTimeFormat(tag, {
    timeZone: "UTC",
    month: "long",
  }).format(date);
  const day = date.getUTCDate();
  return `${capitalize(weekday, locale)} ${day} ${month}`;
}

/** "Släpps 6 nov" / "Out 6 Nov", or the released forms. */
export function formatReleaseCardLabel(
  dateKey: string,
  locale: "en" | "sv",
  kind: "upcoming" | "released",
): string {
  const date = utcNoon(dateKey);
  const tag = locale === "sv" ? "sv-SE" : "en-GB";
  const short = new Intl.DateTimeFormat(tag, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  })
    .format(date)
    .replace(/\./g, "");
  if (kind === "upcoming") {
    return locale === "sv" ? `Släpps ${short}` : `Out ${short}`;
  }
  return locale === "sv" ? `Släpptes ${short}` : `Released ${short}`;
}

export function formatReleaseUpdatedLabel(
  syncedAt: string | null,
  locale: "en" | "sv",
): string | null {
  if (!syncedAt) return null;
  const date = new Date(syncedAt);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = date.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", {
    timeZone: STOCKHOLM,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return locale === "sv" ? `Uppdaterad ${formatted}` : `Updated ${formatted}`;
}

export function releaseMonthYear(now: Date, locale: "en" | "sv"): string {
  return new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", {
    timeZone: STOCKHOLM,
    month: "long",
    year: "numeric",
  }).format(now);
}
