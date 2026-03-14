/**
 * HTTP and parsing for Starwinelist.com.
 * Uses browser adapter (Playwright or Browserless) for headless Chrome – choice via BROWSER_ADAPTER.
 * TODO(menu-extraction): If Starwinelist changes page structure or adds new listing URLs, update selectors/URLs here.
 */

import {
  fetchRenderedHtml as browserFetchHtml,
  fetchPdfViaFunction,
  fetchPdfDirect,
  BrowserlessError,
} from "./browser-adapter";

const BASE_URL = "https://starwinelist.com";
const CRAWL_DELAY_MS = 4000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch HTML via Browserless. Returns null on error (403, timeout, BrowserlessError).
 * When skipDelay is false, waits CRAWL_DELAY_MS before the request to avoid hammering Browserless.
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
    if (e instanceof BrowserlessError && e.status === 429) {
      throw e;
    }
    if (e instanceof BrowserlessError) {
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
    `${BASE_URL}/map`,
    BASE_URL,
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
  console.warn("[starwinelist-scraper] No slugs found from map/stockholm (403 or no matching wine-place links).");
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
 * Parse restaurant page for name, PDF/download link, and "Updated DD Month YYYY".
 * Starwinelist uses venue-page__winelist-link with href like /wine-place/237/download/214 (returns or redirects to PDF).
 * Also supports direct .pdf hrefs. TODO(menu-extraction): If Starwinelist changes HTML/classes, update parsing.
 */
export async function fetchRestaurantPage(slug: string): Promise<{
  name: string | null;
  pdf_url: string | null;
  swl_updated_at: string | null;
} | null> {
  const url = `${BASE_URL}/wine-place/${slug}`;
  const html = await fetchHtml(url, { skipDelay: false });
  if (!html) return null;

  let name: string | null = null;
  let pdf_url: string | null = null;
  let swl_updated_at: string | null = null;

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

  const updatedMatch = html.match(/Updated\s+(\d{1,2}\s+\w+\s+\d{4})/i);
  if (updatedMatch) swl_updated_at = updatedMatch[0].trim();

  return { name, pdf_url, swl_updated_at };
}

/**
 * Download PDF: try Browserless /function (session via restaurant page) first, then direct fetch.
 * Returns null on failure; never throws.
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
    if (e instanceof BrowserlessError && e.status === 429) {
      throw e;
    }
    if (e instanceof BrowserlessError) {
      console.warn("[starwinelist-scraper] PDF /function", e.status, pdfUrl, e.message);
    } else if (e instanceof Error) {
      console.warn("[starwinelist-scraper] PDF /function error:", e.message, pdfUrl);
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
    january: 0, jan: 0, januari: 0, februari: 1, feb: 1, march: 2, mar: 2, mars: 2,
    april: 3, apr: 3, may: 4, maj: 4, juni: 5, jun: 5, july: 6, juli: 6,
    august: 7, aug: 7, augusti: 7, september: 8, sep: 8, october: 9, okt: 9, oct: 9, oktober: 9,
    november: 10, nov: 10, december: 11, dec: 11,
  };
  const month = months[monthStr.toLowerCase()];
  if (month === undefined) return null;
  const d = new Date(Number(year), month, Number(day));
  return isNaN(d.getTime()) ? null : d;
}

export { CRAWL_DELAY_MS };
