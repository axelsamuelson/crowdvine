import { z } from "zod";
import { parseSwlUpdatedAt } from "./starwinelist-scraper";

const widgetEntrySchema = z.object({
  display_name: z.string().min(1),
  updated_raw: z.string().min(1),
  updated_at: z.string().datetime(),
});

const widgetParseResultSchema = z.object({
  entries: z.array(widgetEntrySchema),
  widget_found: z.boolean(),
});

export type StockholmWidgetEntry = z.infer<typeof widgetEntrySchema>;
export type StockholmWidgetParseResult = z.infer<typeof widgetParseResultSchema>;

const WIDGET_MARKER =
  /newest\s+wine\s+list\s+updates|latest\s+updated\s+wine\s+lists/i;

const ENTRY_RE = /(.+?)Updated\s+(\d{1,2}\s+\w+\s+\d{4})/g;

/**
 * Normalize venue names for fuzzy match against starwinelist_sources.name.
 */
export function normalizeVenueName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, " ");
}

function extractWidgetSegment(html: string): string | null {
  const marker = html.match(WIDGET_MARKER);
  if (!marker || marker.index === undefined) return null;
  return stripHtmlTags(html.slice(marker.index, marker.index + 12_000));
}

/**
 * Parse "Newest Wine List Updates" widget from /stockholm HTML.
 * Entries concatenate name+date: "Brasserie MaisonUpdated 02 July 2026".
 */
export function parseStockholmWidgetUpdates(
  html: string,
): StockholmWidgetParseResult {
  const segment = extractWidgetSegment(html);
  if (!segment) {
    return widgetParseResultSchema.parse({
      entries: [],
      widget_found: false,
    });
  }

  const rawPairs: Array<{ display_name: string; updated_raw: string }> = [];
  let match: RegExpExecArray | null;
  ENTRY_RE.lastIndex = 0;
  while ((match = ENTRY_RE.exec(segment)) !== null) {
    const display_name = match[1]?.replace(/\s+/g, " ").trim();
    const datePart = match[2]?.trim();
    if (!display_name || !datePart) continue;
    if (display_name.length < 2) continue;
    if (/^updated$/i.test(display_name)) continue;
    rawPairs.push({
      display_name,
      updated_raw: `Updated ${datePart}`,
    });
  }

  const entries: StockholmWidgetEntry[] = [];
  for (const pair of rawPairs) {
    const parsed = parseSwlUpdatedAt(pair.updated_raw);
    if (!parsed) continue;
    entries.push({
      display_name: pair.display_name,
      updated_raw: pair.updated_raw,
      updated_at: parsed.toISOString(),
    });
  }

  return widgetParseResultSchema.parse({
    entries,
    widget_found: entries.length > 0,
  });
}
