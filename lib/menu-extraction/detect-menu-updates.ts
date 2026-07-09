/**
 * Detect menu updates: widget-feed PRIMARY, sitemap lane secondary.
 * Widget runs every invocation (1 Browserless fetch of /stockholm).
 * Sitemap runs after widget; records sitemap_lastmod for known slugs always,
 * contributes crawl_priority boosts only when lastmod is non-degenerate.
 * New-venue discovery is handled separately by fetchRestaurantSlugsByCity in crawl cron.
 */

import { BrowserAdapterError } from "./browser-adapter-error";
import {
  getStarwinelistSourceBySlug,
  updateStarwinelistSource,
} from "./db";
import {
  alertDetectMenuUpdatesDegenerateLastmod,
  alertDetectMenuUpdatesFailure,
  alertDetectMenuUpdatesNoLastmod,
  alertDetectMenuUpdatesZeroWinePlaceUrls,
} from "./pipeline-alerts";
import {
  fetchAllSitemapWinePlaceEntries,
  isDateOnlySitemapLastmod,
  shouldBoostFromSitemapLastmod,
  utcDatePart,
  type SitemapWinePlaceEntry,
} from "./sitemap-discovery";
import { runDetectMenuUpdatesFromWidget } from "./detect-menu-updates-widget";
import {
  getBrowserlessUsage,
  withBrowserlessUsageTracking,
  type BrowserlessUsageSummary,
} from "./browserless-usage";

export const DEFAULT_SITEMAP_LASTMOD_DEGENERATE_THRESHOLD = 0.8;

export type DetectMenuUpdatesMode = "combined" | "widget_only";

export interface DetectMenuUpdatesSummary {
  mode: DetectMenuUpdatesMode;
  sitemap_urls: number;
  wine_place_entries: number;
  entries_with_lastmod: number;
  unknown_slug_skipped: number;
  sitemap_lastmods_recorded: number;
  widget_priority_boosted: number;
  sitemap_priority_boosted: number;
  priority_boosted: number;
  sitemap_lastmod_degenerate?: boolean;
  sitemap_lastmod_mode_share?: number;
  sitemap_lastmod_mode_date?: string | null;
  widget_entries?: number;
  widget_matched?: number;
  unmatched_names?: string[];
  error?: string;
  browserless?: BrowserlessUsageSummary;
}

export interface SitemapLastmodDegeneracyAnalysis {
  degenerate: boolean;
  share: number;
  modeDate: string | null;
  entriesWithLastmod: number;
}

export function getSitemapLastmodDegenerateThreshold(): number {
  const raw = process.env.SITEMAP_LASTMOD_DEGENERATE_THRESHOLD;
  if (!raw?.trim()) return DEFAULT_SITEMAP_LASTMOD_DEGENERATE_THRESHOLD;
  const parsed = Number.parseFloat(raw.trim());
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 1) {
    return DEFAULT_SITEMAP_LASTMOD_DEGENERATE_THRESHOLD;
  }
  return parsed;
}

export function lastmodCalendarDateForEntry(entry: SitemapWinePlaceEntry): string | null {
  if (!entry.lastmod_parsed) return null;
  if (entry.lastmod && isDateOnlySitemapLastmod(entry.lastmod)) {
    return entry.lastmod.trim();
  }
  return utcDatePart(entry.lastmod_parsed);
}

/**
 * Share of wine-place entries whose lastmod calendar date equals the mode date.
 * Used to detect bulk-stamped sitemaps unsuitable for per-venue diffing.
 */
export function analyzeSitemapLastmodDegeneracy(
  entries: SitemapWinePlaceEntry[],
  threshold: number = getSitemapLastmodDegenerateThreshold(),
): SitemapLastmodDegeneracyAnalysis {
  const withLastmod = entries.filter((e) => e.lastmod_parsed != null);
  if (withLastmod.length === 0) {
    return {
      degenerate: false,
      share: 0,
      modeDate: null,
      entriesWithLastmod: 0,
    };
  }

  const counts = new Map<string, number>();
  for (const entry of withLastmod) {
    const day = lastmodCalendarDateForEntry(entry);
    if (!day) continue;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  let modeDate: string | null = null;
  let modeCount = 0;
  for (const [day, count] of counts) {
    if (count > modeCount) {
      modeCount = count;
      modeDate = day;
    }
  }

  const share = modeCount / withLastmod.length;
  return {
    degenerate: share > threshold,
    share,
    modeDate,
    entriesWithLastmod: withLastmod.length,
  };
}

/** Persist sitemap lastmod calendar date for known DB slugs (no boost logic). */
export async function recordSitemapLastmodsForKnownSlugs(
  entries: SitemapWinePlaceEntry[],
): Promise<{
  sitemap_lastmods_recorded: number;
  unknown_slug_skipped: number;
}> {
  let sitemap_lastmods_recorded = 0;
  let unknown_slug_skipped = 0;

  for (const entry of entries) {
    const day = lastmodCalendarDateForEntry(entry);
    if (!day) continue;

    const existing = await getStarwinelistSourceBySlug(entry.slug);
    if (!existing) {
      unknown_slug_skipped += 1;
      continue;
    }

    await updateStarwinelistSource(existing.id, { sitemap_lastmod: day });
    sitemap_lastmods_recorded += 1;
  }

  if (unknown_slug_skipped > 0) {
    console.warn(
      "[detect-menu-updates] Sitemap entries skipped (unknown slug):",
      unknown_slug_skipped,
    );
  }

  return { sitemap_lastmods_recorded, unknown_slug_skipped };
}

async function applySitemapBoosts(
  entries: SitemapWinePlaceEntry[],
): Promise<{ sitemap_priority_boosted: number }> {
  let sitemap_priority_boosted = 0;

  for (const entry of entries) {
    const existing = await getStarwinelistSourceBySlug(entry.slug);
    if (!existing) continue;

    if (!shouldBoostFromSitemapLastmod(entry, existing.last_checked_at)) {
      continue;
    }

    await updateStarwinelistSource(existing.id, {
      crawl_priority: 100,
      crawl_attempts: 0,
    });
    sitemap_priority_boosted += 1;
  }

  return { sitemap_priority_boosted };
}

function widgetSummaryFields(
  widget: Awaited<ReturnType<typeof runDetectMenuUpdatesFromWidget>>,
) {
  return {
    widget_entries: widget.widget_entries,
    widget_matched: widget.matched,
    widget_priority_boosted: widget.priority_boosted,
    unmatched_names: widget.unmatched_names,
  };
}

async function runSitemapLane(
  city: string,
  widget: Awaited<ReturnType<typeof runDetectMenuUpdatesFromWidget>>,
): Promise<DetectMenuUpdatesSummary> {
  const entries = await fetchAllSitemapWinePlaceEntries();
  const entries_with_lastmod = entries.filter((e) => e.lastmod_parsed != null).length;
  const base = {
    mode: "combined" as const,
    sitemap_urls: entries.length,
    wine_place_entries: entries.length,
    entries_with_lastmod,
    ...widgetSummaryFields(widget),
  };

  if (entries.length === 0) {
    await alertDetectMenuUpdatesZeroWinePlaceUrls();
    throw new Error("Sitemap contained zero /wine-place/ URLs");
  }

  const recorded = await recordSitemapLastmodsForKnownSlugs(entries);

  if (entries_with_lastmod === 0) {
    await alertDetectMenuUpdatesNoLastmod();
    console.warn(
      "[detect-menu-updates] No lastmod in sitemap;",
      recorded.sitemap_lastmods_recorded,
      "snapshots recorded",
    );
    return {
      ...base,
      unknown_slug_skipped: recorded.unknown_slug_skipped,
      sitemap_lastmods_recorded: recorded.sitemap_lastmods_recorded,
      sitemap_priority_boosted: 0,
      priority_boosted: widget.priority_boosted,
    };
  }

  const degeneracy = analyzeSitemapLastmodDegeneracy(entries);
  if (degeneracy.degenerate && degeneracy.modeDate) {
    const sharePct = Math.round(degeneracy.share * 100);
    await alertDetectMenuUpdatesDegenerateLastmod(sharePct, degeneracy.modeDate);
    console.warn(
      "[detect-menu-updates] Sitemap lastmod degenerate:",
      `${sharePct}% on ${degeneracy.modeDate}; skipping sitemap boosts`,
    );
    return {
      ...base,
      unknown_slug_skipped: recorded.unknown_slug_skipped,
      sitemap_lastmods_recorded: recorded.sitemap_lastmods_recorded,
      sitemap_lastmod_degenerate: true,
      sitemap_lastmod_mode_share: degeneracy.share,
      sitemap_lastmod_mode_date: degeneracy.modeDate,
      sitemap_priority_boosted: 0,
      priority_boosted: widget.priority_boosted,
    };
  }

  const boosted = await applySitemapBoosts(entries);

  return {
    ...base,
    unknown_slug_skipped: recorded.unknown_slug_skipped,
    sitemap_lastmods_recorded: recorded.sitemap_lastmods_recorded,
    sitemap_lastmod_degenerate: false,
    sitemap_lastmod_mode_share: degeneracy.share,
    sitemap_lastmod_mode_date: degeneracy.modeDate,
    sitemap_priority_boosted: boosted.sitemap_priority_boosted,
    priority_boosted: widget.priority_boosted + boosted.sitemap_priority_boosted,
  };
}

function attachBrowserlessUsage<T extends DetectMenuUpdatesSummary>(
  summary: T,
): T {
  const browserless = getBrowserlessUsage();
  if (!browserless) return summary;
  return { ...summary, browserless };
}

export async function runDetectMenuUpdates(
  city: string = "stockholm",
): Promise<DetectMenuUpdatesSummary> {
  const { result } = await withBrowserlessUsageTracking(async () => {
    const widget = await runDetectMenuUpdatesFromWidget(city);

    try {
      return await runSitemapLane(city, widget);
    } catch (err) {
      if (err instanceof BrowserAdapterError && (err.status === 401 || err.status === 429)) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      await alertDetectMenuUpdatesFailure(message);
      return {
        mode: "widget_only" as const,
        sitemap_urls: 0,
        wine_place_entries: 0,
        entries_with_lastmod: 0,
        unknown_slug_skipped: 0,
        sitemap_lastmods_recorded: 0,
        sitemap_priority_boosted: 0,
        priority_boosted: widget.priority_boosted,
        error: message,
        ...widgetSummaryFields(widget),
      };
    }
  });

  const summary = attachBrowserlessUsage(result);
  if (summary.browserless) {
    console.warn("[detect-menu-updates] Browserless usage:", summary.browserless);
  }
  return summary;
}

/** @deprecated Use runDetectMenuUpdates — widget is always primary. */
export async function runDetectMenuUpdatesFromSitemap(
  city: string = "stockholm",
): Promise<DetectMenuUpdatesSummary> {
  return runDetectMenuUpdates(city);
}

export async function runDetectMenuUpdatesSafe(
  city: string = "stockholm",
): Promise<DetectMenuUpdatesSummary> {
  try {
    return await runDetectMenuUpdates(city);
  } catch (err) {
    if (err instanceof BrowserAdapterError && (err.status === 401 || err.status === 429)) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    await alertDetectMenuUpdatesFailure(message);
    return {
      mode: "widget_only",
      sitemap_urls: 0,
      wine_place_entries: 0,
      entries_with_lastmod: 0,
      unknown_slug_skipped: 0,
      sitemap_lastmods_recorded: 0,
      widget_priority_boosted: 0,
      sitemap_priority_boosted: 0,
      priority_boosted: 0,
      error: message,
    };
  }
}
