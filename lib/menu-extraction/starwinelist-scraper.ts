/**
 * HTTP and parsing for Starwinelist.com.
 * Uses browser adapter (Chromium via playwright-core / @sparticuz/chromium on Vercel, or USE_LOCAL_FETCH).
 * TODO(menu-extraction): If Starwinelist changes page structure or adds new listing URLs, update selectors/URLs here.
 */

import {
  fetchRenderedHtml as browserFetchHtml,
  fetchPdfViaFunction,
  fetchPdfDirect,
} from "./browser-adapter";
import { BrowserAdapterError } from "./browser-adapter-error";
import { alertBrowserlessLimit } from "./pipeline-alerts";
import { parseSwlLocationFromHtml, type SwlLocation } from "./swl-location";

const BASE_URL = "https://starwinelist.com";
const CRAWL_DELAY_MS = 4000;

export interface RestaurantPageData {
  name: string | null;
  pdf_url: string | null;
  /** Raw "Updated DD Month YYYY" for the newest wine list on the page. */
  swl_updated_at: string | null;
  /** ISO timestamp of the newest Updated date on the page. */
  swl_updated_at_parsed: string | null;
  swl_location: SwlLocation | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function throwIfBrowserlessQuota(e: unknown, url: string): Promise<void> {
  if (e instanceof BrowserAdapterError && e.status === 429) {
    await alertBrowserlessLimit(429, e.message);
    throw e;
  }
  if (e instanceof BrowserAdapterError && e.status === 401) {
    await alertBrowserlessLimit(401, `${url}: ${e.message}`);
    throw e;
  }
}

/**
 * Fetch HTML via Chromium (or plain fetch when USE_LOCAL_FETCH). Returns null on error (403, timeout).
 * When skipDelay is false, waits CRAWL_DELAY_MS before the request.
 */
async function fetchHtml(
  url: string,
  options: { skipDelay?: boolean } = {}
): Promise<string | null> {
  if (!options.skipDelay) {
    await sleep(CRAWL_DELAY_MS);
  }
  try {
    return await browserFetchHtml(url);
  } catch (e) {
    await throwIfBrowserlessQuota(e, url);
    if (e instanceof BrowserAdapterError) {
      console.warn("[starwinelist-scraper]", e.status, url, e.message);
    } else if (e instanceof Error) {
      console.warn("[starwinelist-scraper] Fetch error:", e.message, url);
    }
    return null;
  }
}

/**
 * Extract slugs from HTML: links matching /wine-place/[slug] or /sv/.../wine-place equivalent.
 * TODO(menu-extraction): If Starwinelist changes URL structure (e.g. /venue/slug), update regex.
 */
function extractSlugsFromHtml(html: string): string[] {
  const slugs: string[] = [];
  // Slug can be mixed case in HTML (e.g. /wine-place/Agnes); we normalize to lowercase
  const regex = /(?:href|content)=["'](?:https?:\/\/[^"']*\/)?(?:wine-place|winstallen)\/([a-zA-Z0-9-]+)(?:\/[^"']*)?["']/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const slug = m[1].toLowerCase().trim();
    if (slug && !slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}

/**
 * Fetches list of restaurant slugs from map/stockholm (and fallback URLs).
 * Extracts slugs from "more info" links to /wine-place/[slug] on the page.
 * TODO(menu-extraction): If Starwinelist changes listing URLs or link structure, update here.
 */
export async function fetchRestaurantSlugsByCity(
  city: "stockholm"
): Promise<string[]> {
  const urlsToTry = [
    `${BASE_URL}/map/${city}`,
    `${BASE_URL}/wine-guide/the-best-wine-restaurants-in-${city}`,
    `${BASE_URL}/${city}`,
  ];
  for (let i = 0; i < urlsToTry.length; i++) {
    const url = urlsToTry[i];
    const html = await fetchHtml(url, { skipDelay: i === 0 });
    if (!html) continue;
    const slugs = extractSlugsFromHtml(html);
    if (slugs.length > 0) {
      return slugs;
    }
  }
  console.warn(
    `[starwinelist-scraper] No slugs found for city=${city} (403, SPA, or no wine-place links).`,
  );
  return [];
}

/** Normalise href: strip fragment and resolve relative URL to absolute. */
function normaliseHref(raw: string): string {
  let s = raw.trim();
  const hashIndex = s.indexOf("#");
  if (hashIndex !== -1) s = s.slice(0, hashIndex);
  if (!s) return "";
  return s.startsWith("http") ? s : new URL(s, BASE_URL).href;
}

/**
 * Collect all "Updated DD Month YYYY" strings from venue HTML.
 */
export function parseAllSwlUpdatedAtStrings(html: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const regex = /Updated\s+\d{1,2}\s+\w+\s+\d{4}/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const raw = m[0].replace(/\s+/g, " ").trim();
    if (!seen.has(raw)) {
      seen.add(raw);
      out.push(raw);
    }
  }
  return out;
}

/**
 * Parse all Updated dates on a venue page and return the newest.
 */
export function parseMaxSwlUpdatedAtFromHtml(html: string): {
  swl_updated_at: string | null;
  swl_updated_at_parsed: Date | null;
} {
  const strings = parseAllSwlUpdatedAtStrings(html);
  let maxDate: Date | null = null;
  let maxRaw: string | null = null;
  for (const raw of strings) {
    const d = parseSwlUpdatedAt(raw);
    if (d && (!maxDate || d.getTime() > maxDate.getTime())) {
      maxDate = d;
      maxRaw = raw;
    }
  }
  return { swl_updated_at: maxRaw, swl_updated_at_parsed: maxDate };
}

/**
 * Parse restaurant page for name, PDF/download link, and max "Updated DD Month YYYY".
 * Starwinelist uses venue-page__winelist-link with href like /wine-place/237/download/214 (returns or redirects to PDF).
 * Also supports direct .pdf hrefs. TODO(menu-extraction): If Starwinelist changes HTML/classes, update parsing.
 */
export async function fetchRestaurantPage(slug: string): Promise<RestaurantPageData | null> {
  const url = `${BASE_URL}/wine-place/${slug}`;
  const html = await fetchHtml(url, { skipDelay: false });
  if (!html) return null;

  let name: string | null = null;
  let pdf_url: string | null = null;

  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ?? html.match(/<title>([^|<]+)/i);
  if (nameMatch) name = nameMatch[1].replace(/\s+/g, " ").trim() || null;

  // 1) Prefer Starwinelist download endpoint: /wine-place/{venueId}/download/{docId} (venue-page__winelist-link)
  const downloadMatch = html.match(/href=["']([^"']*\/wine-place\/\d+\/download\/\d+[^"']*)["']/i);
  if (downloadMatch) {
    pdf_url = normaliseHref(downloadMatch[1]);
  }
  // 2) Fallback: direct .pdf link
  if (!pdf_url) {
    const pdfMatch = html.match(/href=["']([^"']*\.pdf[^"']*)["']/i);
    if (pdfMatch) {
      pdf_url = normaliseHref(pdfMatch[1]);
    }
  }

  const { swl_updated_at, swl_updated_at_parsed } = parseMaxSwlUpdatedAtFromHtml(html);
  const swl_location = parseSwlLocationFromHtml(html);

  return {
    name,
    pdf_url,
    swl_updated_at,
    swl_updated_at_parsed: swl_updated_at_parsed?.toISOString() ?? null,
    swl_location,
  };
}

/**
 * Download PDF: browser session (restaurant page → PDF) first, then direct fetch.
 * Returns null on failure; never throws except 401/429 from browser layer.
 */
export async function downloadPdf(
  restaurantUrl: string,
  pdfUrl: string
): Promise<Buffer | null> {
  await sleep(CRAWL_DELAY_MS);
  try {
    const buf = await fetchPdfViaFunction(restaurantUrl, pdfUrl);
    if (buf && buf.length > 0) return buf;
  } catch (e) {
    await throwIfBrowserlessQuota(e, pdfUrl);
    if (e instanceof BrowserAdapterError) {
      console.warn("[starwinelist-scraper] PDF session download", e.status, pdfUrl, e.message);
    } else if (e instanceof Error) {
      console.warn("[starwinelist-scraper] PDF session error:", e.message, pdfUrl);
    }
  }
  try {
    const buf = await fetchPdfDirect(pdfUrl);
    if (buf && buf.length > 0) return buf;
  } catch (e) {
    if (e instanceof Error) {
      console.warn("[starwinelist-scraper] PDF direct fetch error:", e.message, pdfUrl);
    }
  }
  return null;
}

/**
 * Parse "Updated 05 March 2026" (or "Updated 5 March 2026") to Date.
 * TODO(menu-extraction): If Starwinelist changes date format, extend parsing.
 */
export function parseSwlUpdatedAt(raw: string): Date | null {
  const t = raw.replace(/\s+/g, " ").trim();
  const m = t.match(/Updated\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (!m) return null;
  const [, day, monthStr, year] = m;
  const months: Record<string, number> = {
    january: 0, jan: 0, januari: 0,
    february: 1, feb: 1, februari: 1,
    march: 2, mar: 2, mars: 2,
    april: 3, apr: 3,
    may: 4, maj: 4,
    june: 5, jun: 5, juni: 5,
    july: 6, jul: 6, juli: 6,
    august: 7, aug: 7, augusti: 7,
    september: 8, sep: 8,
    october: 9, okt: 9, oct: 9, oktober: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };
  const month = months[monthStr.toLowerCase()];
  if (month === undefined) return null;
  const d = new Date(Number(year), month, Number(day));
  return isNaN(d.getTime()) ? null : d;
}

export { CRAWL_DELAY_MS };
