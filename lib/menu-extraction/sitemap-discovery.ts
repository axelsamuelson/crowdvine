/**
 * Starwinelist sitemap discovery – fetch via Browserless, parse wine-place URLs + lastmod.
 */

import { z } from "zod";
import { fetchRenderedHtml } from "./browser-adapter";
import { isStarwinelist404Slug } from "./db";

export const STARWINELIST_SITEMAP_URL = "https://starwinelist.com/sitemap.xml";

const sitemapRawEntrySchema = z.object({
  loc: z.string().url(),
  lastmod: z.string().optional(),
});

const sitemapWinePlaceEntrySchema = z.object({
  slug: z.string().min(1),
  loc: z.string().url(),
  lastmod: z.string().optional(),
  lastmod_parsed: z.string().datetime().nullable(),
});

export type SitemapWinePlaceEntry = z.infer<typeof sitemapWinePlaceEntrySchema>;

const WINE_PLACE_LOC_RE =
  /(?:https?:\/\/[^/]+)?\/(?:wine-place|winstallen)\/([a-zA-Z0-9-]+)\/?(?:[#?].*)?$/i;

export function parseSitemapLastmod(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when sitemap lastmod is YYYY-MM-DD without a time component. */
export function isDateOnlySitemapLastmod(lastmod: string | undefined): boolean {
  if (!lastmod?.trim()) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(lastmod.trim());
}

/** UTC calendar date (YYYY-MM-DD) from an ISO timestamp. */
export function utcDatePart(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Whether sitemap lastmod warrants a crawl priority boost for an existing source.
 * Compares against last_checked_at ("sitemap changed after our last look").
 * swl_updated_at_parsed is intentionally not used here — that drives fast-skip in crawlRestaurant.
 */
export function shouldBoostFromSitemapLastmod(
  entry: Pick<SitemapWinePlaceEntry, "lastmod" | "lastmod_parsed">,
  lastCheckedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!entry.lastmod_parsed) return false;
  if (!lastCheckedAt) return true;

  const checkedMs = new Date(lastCheckedAt).getTime();
  if (Number.isNaN(checkedMs)) return true;

  if (entry.lastmod && isDateOnlySitemapLastmod(entry.lastmod)) {
    const sitemapDay = entry.lastmod.trim();
    const checkedDay = utcDatePart(lastCheckedAt);
    const todayDay = utcDatePart(now.toISOString());

    if (sitemapDay > checkedDay) return true;
    if (sitemapDay < checkedDay) return false;
    // Same calendar day as last check: only re-boost while still on that day
    // (same-day double update). After midnight, stale equal lastmod must not re-boost.
    return todayDay === sitemapDay;
  }

  const sitemapMs = new Date(entry.lastmod_parsed).getTime();
  return sitemapMs > checkedMs;
}

export function extractWinePlaceSlugFromLoc(loc: string): string | null {
  const m = loc.trim().match(WINE_PLACE_LOC_RE);
  if (!m?.[1]) return null;
  const slug = m[1].toLowerCase();
  if (!slug || isStarwinelist404Slug(slug)) return null;
  return slug;
}

function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

/** Extract <url><loc>…</loc><lastmod>?</lastmod></url> blocks from a urlset document. */
export function parseSitemapUrlEntries(xml: string): Array<z.infer<typeof sitemapRawEntrySchema>> {
  const out: Array<z.infer<typeof sitemapRawEntrySchema>> = [];
  const urlBlockRe = /<url>([\s\S]*?)<\/url>/gi;
  let block: RegExpExecArray | null;
  while ((block = urlBlockRe.exec(xml)) !== null) {
    const chunk = block[1] ?? "";
    const loc = chunk.match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = chunk.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i)?.[1]?.trim();
    out.push(sitemapRawEntrySchema.parse({ loc, ...(lastmod ? { lastmod } : {}) }));
  }
  return out;
}

/** Extract child sitemap URLs from a sitemap index document. */
export function parseSitemapIndexLocs(xml: string): string[] {
  const locs: string[] = [];
  const sitemapBlockRe = /<sitemap>([\s\S]*?)<\/sitemap>/gi;
  let block: RegExpExecArray | null;
  while ((block = sitemapBlockRe.exec(xml)) !== null) {
    const loc = block[1]?.match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1]?.trim();
    if (loc) locs.push(loc);
  }
  return locs;
}

export function toWinePlaceEntries(
  raw: Array<z.infer<typeof sitemapRawEntrySchema>>,
): SitemapWinePlaceEntry[] {
  const bySlug = new Map<string, SitemapWinePlaceEntry>();

  for (const row of raw) {
    const slug = extractWinePlaceSlugFromLoc(row.loc);
    if (!slug) continue;
    const parsed = parseSitemapLastmod(row.lastmod);
    const candidate = sitemapWinePlaceEntrySchema.parse({
      slug,
      loc: row.loc,
      ...(row.lastmod ? { lastmod: row.lastmod } : {}),
      lastmod_parsed: parsed?.toISOString() ?? null,
    });

    const existing = bySlug.get(slug);
    if (!existing) {
      bySlug.set(slug, candidate);
      continue;
    }
    const existingMs = existing.lastmod_parsed
      ? new Date(existing.lastmod_parsed).getTime()
      : 0;
    const candidateMs = candidate.lastmod_parsed
      ? new Date(candidate.lastmod_parsed).getTime()
      : 0;
    if (candidateMs >= existingMs) {
      bySlug.set(slug, candidate);
    }
  }

  return [...bySlug.values()];
}

export async function fetchSitemapXml(url: string): Promise<string> {
  const body = await fetchRenderedHtml(url);
  if (!body?.trim()) {
    throw new Error(`Empty sitemap response: ${url}`);
  }
  return body;
}

/**
 * Fetch root sitemap (and sub-sitemaps when index) and return deduped wine-place entries.
 */
export async function fetchAllSitemapWinePlaceEntries(
  rootUrl: string = STARWINELIST_SITEMAP_URL,
): Promise<SitemapWinePlaceEntry[]> {
  const rootXml = await fetchSitemapXml(rootUrl);
  const xmlDocs: string[] = [];

  if (isSitemapIndex(rootXml)) {
    const childLocs = parseSitemapIndexLocs(rootXml);
    if (childLocs.length === 0) {
      throw new Error("Sitemap index contained no child <loc> entries");
    }
    for (const childUrl of childLocs) {
      try {
        xmlDocs.push(await fetchSitemapXml(childUrl));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[sitemap-discovery] Sub-sitemap fetch failed:", childUrl, message);
      }
    }
    if (xmlDocs.length === 0) {
      throw new Error("All sub-sitemap fetches failed");
    }
  } else {
    xmlDocs.push(rootXml);
  }

  const raw: Array<z.infer<typeof sitemapRawEntrySchema>> = [];
  for (const doc of xmlDocs) {
    raw.push(...parseSitemapUrlEntries(doc));
  }

  return toWinePlaceEntries(raw);
}

