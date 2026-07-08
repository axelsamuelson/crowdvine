/**
 * Primary detection: /stockholm "Newest Wine List Updates" widget (name-based matching).
 */

import { fetchRenderedHtml } from "./browser-adapter";
import {
  listStarwinelistSources,
  updateStarwinelistSource,
} from "./db";
import { alertDetectMenuUpdatesUnmatched } from "./pipeline-alerts";
import {
  normalizeVenueName,
  parseStockholmWidgetUpdates,
} from "./stockholm-widget";

const STOCKHOLM_WIDGET_URL = "https://starwinelist.com/stockholm";

export interface WidgetDetectResult {
  widget_entries: number;
  matched: number;
  priority_boosted: number;
  unmatched_names: string[];
}

export async function runDetectMenuUpdatesFromWidget(
  city: string = "stockholm",
): Promise<WidgetDetectResult> {
  const html = await fetchRenderedHtml(STOCKHOLM_WIDGET_URL);
  const parsed = parseStockholmWidgetUpdates(html);

  if (!parsed.widget_found || parsed.entries.length === 0) {
    return {
      widget_entries: 0,
      matched: 0,
      priority_boosted: 0,
      unmatched_names: [],
    };
  }

  const sources = await listStarwinelistSources(city);
  const byName = new Map<string, typeof sources>();
  for (const source of sources) {
    if (!source.name) continue;
    const key = normalizeVenueName(source.name);
    const bucket = byName.get(key) ?? [];
    bucket.push(source);
    byName.set(key, bucket);
  }

  let matched = 0;
  let priority_boosted = 0;
  const unmatched_names: string[] = [];

  for (const entry of parsed.entries) {
    const key = normalizeVenueName(entry.display_name);
    const candidates = byName.get(key) ?? [];
    if (candidates.length === 0) {
      unmatched_names.push(entry.display_name);
      continue;
    }

    const widgetMs = new Date(entry.updated_at).getTime();
    for (const source of candidates) {
      matched += 1;
      const storedMs = source.swl_updated_at_parsed
        ? new Date(source.swl_updated_at_parsed).getTime()
        : 0;
      if (widgetMs > storedMs) {
        await updateStarwinelistSource(source.id, {
          crawl_priority: 100,
          crawl_attempts: 0,
        });
        priority_boosted += 1;
      }
    }
  }

  if (unmatched_names.length > 0) {
    await alertDetectMenuUpdatesUnmatched(unmatched_names);
  }

  return {
    widget_entries: parsed.entries.length,
    matched,
    priority_boosted,
    unmatched_names,
  };
}
