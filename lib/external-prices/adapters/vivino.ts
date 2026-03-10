/**
 * Adapter for Vivino (www.vivino.com).
 * Detection: host-based (vivino.com). Search: /search/wines?q=...; PDP: /Wine-Name/w/123 or similar.
 * PDP parsing: JSON-LD, og:meta, then regex for $/€ price and title from h1/og:title.
 */

import type { SourceAdapter } from "./base";
import type { NormalizedOffer, PriceSource, WineForMatch } from "../types";
import { fetchWithCache, fetchWithRetries, delay } from "../fetch-with-retries";
import { buildQueryPack } from "../query-pack";

const MAX_CANDIDATES = 15;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function getBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

/** Extract wine PDP URLs from HTML: href="/Wine-Name/w/123" or full vivino.com/.../w/123 */
function extractWineUrls(html: string, base: string): string[] {
  const seen = new Set<string>();
  const baseOrigin = (() => {
    try {
      return new URL(base).origin;
    } catch {
      return "https://www.vivino.com";
    }
  })();
  // Vivino wine URLs: /Wine-Slug/w/123 or /en/.../w/123
  const re = /href\s*=\s*["'](?:https?:\/\/[^"']*vivino\.com)?(\/[^"']*\/w\/\d+)[^"']*["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const path = m[1].trim();
    const full = path.startsWith("http") ? path : baseOrigin + path;
    if (!seen.has(full)) seen.add(full);
  }
  return Array.from(seen);
}

/** Parse Vivino rating from embedded JSON (e.g. "ratings_average":4.4). */
function parseRating(html: string): number | null {
  const m = html.match(/"ratings_average"\s*:\s*([0-9.]+)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : null;
}

/** Parse number of ratings from embedded JSON (e.g. "ratings_count":1234). */
function parseRatingCount(html: string): number | null {
  const m = html.match(/"ratings_count"\s*:\s*(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Parse price from embedded JSON: bottle_price, price.amount, or price_in_cents. */
function parsePriceFromJson(html: string): { amount: number; currency: string } | null {
  // "bottle_price":{"amount":146.95,"currency":"USD"} or "price":{"amount":...
  const bottlePrice = html.match(/"bottle_price"\s*:\s*\{\s*"amount"\s*:\s*([0-9.]+)\s*,\s*"currency"\s*:\s*"([A-Z]{3})"/);
  if (bottlePrice) {
    const amount = parseFloat(bottlePrice[1]);
    if (Number.isFinite(amount)) return { amount, currency: bottlePrice[2] };
  }
  const priceAmount = html.match(/"price"\s*:\s*\{\s*"amount"\s*:\s*([0-9.]+)\s*,\s*"currency"\s*:\s*"([A-Z]{3})"/);
  if (priceAmount) {
    const amount = parseFloat(priceAmount[1]);
    if (Number.isFinite(amount)) return { amount, currency: priceAmount[2] };
  }
  // price_in_cents (e.g. 14695) with currency nearby
  const centsMatch = html.match(/"price_in_cents"\s*:\s*(\d+)/);
  if (centsMatch) {
    const cents = parseInt(centsMatch[1], 10);
    if (Number.isFinite(cents) && cents > 0) {
      const currency = html.includes('"priceCurrency":"EUR"') ? "EUR" : html.includes('"priceCurrency":"GBP"') ? "GBP" : "USD";
      return { amount: cents / 100, currency };
    }
  }
  return null;
}

/** Parse PDP HTML for title, price, currency, rating. */
function parsePdpHtml(html: string, pdpUrl: string): NormalizedOffer | null {
  let title = "";
  let priceAmount: number | null = null;
  let currency = "USD";
  let available = true;
  const rating = parseRating(html);
  let ratingCount = parseRatingCount(html);

  // Embedded JSON price (Vivino often has bottle_price or price in script)
  const jsonPrice = parsePriceFromJson(html);
  if (jsonPrice) {
    priceAmount = jsonPrice.amount;
    currency = jsonPrice.currency;
  }

  // JSON-LD Product (Vivino uses AggregateOffer with lowPrice/highPrice)
  const jsonLdMatch = html.match(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      const contentMatch = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      const raw = contentMatch?.[1]?.trim();
      if (!raw) continue;
      try {
        const data = JSON.parse(raw) as { "@type"?: string; name?: string; offers?: unknown; aggregateRating?: { ratingValue?: string; reviewCount?: number } };
        const type = data["@type"];
        if (type === "Product" || (typeof type === "string" && type.includes("Product"))) {
          if (data.name) title = data.name;
          if (priceAmount == null) {
            const offers = data.offers;
            if (offers) {
              const o = Array.isArray(offers) ? offers[0] : offers;
              if (o && typeof o === "object") {
                const offer = o as {
                  price?: number | string;
                  priceCurrency?: string;
                  availability?: string;
                  lowPrice?: number | string;
                  highPrice?: number | string;
                };
                if (offer.price != null) priceAmount = typeof offer.price === "string" ? parseFloat(offer.price) : offer.price;
                else if (offer.lowPrice != null) priceAmount = typeof offer.lowPrice === "string" ? parseFloat(offer.lowPrice) : offer.lowPrice;
                if (offer.priceCurrency) currency = String(offer.priceCurrency).toUpperCase();
                if (offer.availability && /soldout|outofstock/i.test(String(offer.availability))) available = false;
              }
            }
          }
          const jsonLdRating = data.aggregateRating?.ratingValue != null ? parseFloat(String(data.aggregateRating.ratingValue)) : null;
          const effectiveRating = rating ?? (Number.isFinite(jsonLdRating) && jsonLdRating! >= 0 && jsonLdRating! <= 5 ? jsonLdRating : null);
          const effectiveCount = ratingCount ?? (typeof data.aggregateRating?.reviewCount === "number" ? data.aggregateRating.reviewCount : null);
          if (title && (priceAmount != null || effectiveRating != null)) {
            return { priceAmount, currency, available, titleRaw: title, pdpUrl, rating: effectiveRating ?? undefined, ratingCount: effectiveCount ?? undefined };
          }
        }
      } catch {
        continue;
      }
    }
  }

  // og:title, og:price:amount, og:price:currency
  const ogTitle = html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (ogTitle) title = ogTitle[1].replace(/&amp;/g, "&").trim();
  if (priceAmount == null) {
    const ogPrice = html.match(/<meta[^>]*property\s*=\s*["']og:price:amount["'][^>]*content\s*=\s*["']([^"']+)["']/i);
    if (ogPrice) priceAmount = parseFloat(ogPrice[1].replace(",", "."));
  }
  const ogCurrency = html.match(/<meta[^>]*property\s*=\s*["']og:price:currency["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (ogCurrency) currency = ogCurrency[1].trim().toUpperCase();
  if (title && (priceAmount != null || rating != null)) {
    return { priceAmount, currency, available, titleRaw: title, pdpUrl, rating: rating ?? undefined, ratingCount: ratingCount ?? undefined };
  }

  // Fallback: h1 for title, $XX.XX or €XX.XX for price
  if (!title) {
    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1) title = h1[1].replace(/&amp;/g, "&").trim();
    if (!title && ogTitle) title = ogTitle[1].replace(/&amp;/g, "&").trim();
  }
  if (priceAmount == null) {
    const dollarMatch = html.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/);
    const euroMatch = html.match(/€\s*([0-9]+(?:\.[0-9]{2})?)/);
    if (dollarMatch) {
      priceAmount = parseFloat(dollarMatch[1]);
      currency = "USD";
    } else if (euroMatch) {
      priceAmount = parseFloat(euroMatch[1]);
      currency = "EUR";
    }
  }
  if (title || priceAmount != null || rating != null) {
    return {
      priceAmount: priceAmount ?? null,
      currency,
      available,
      titleRaw: title || "Unknown",
      pdpUrl,
      rating: rating ?? undefined,
      ratingCount: ratingCount ?? undefined,
    };
  }
  return null;
}

async function searchCandidates(wine: WineForMatch, source: PriceSource): Promise<string[]> {
  const base = getBase(source.base_url);
  const queries = buildQueryPack(wine);
  const seen = new Set<string>();

  for (const q of queries) {
    const searchUrl = `${base}/search/wines?q=${encodeURIComponent(q)}`;
    const { text, ok } = await fetchWithCache(searchUrl, {
      timeoutMs: 15_000,
      maxRetries: 2,
      cacheTtlMs: 5 * 60 * 1000,
      headers: { "User-Agent": BROWSER_UA },
    });
    if (ok && text) {
      const urls = extractWineUrls(text, base);
      for (const u of urls) {
        if (!seen.has(u)) {
          seen.add(u);
          if (seen.size >= MAX_CANDIDATES) break;
        }
      }
    }
    await delay(source.rate_limit_delay_ms ?? 2000);
    if (seen.size >= MAX_CANDIDATES) break;
  }

  const list = Array.from(seen);
  if (list.length > 0) return list;
  // Fallback: return search URL so user can paste PDP URL manually; fetchOffer will try to parse search page
  const firstQuery = queries[0] || wine.wine_name || "wine";
  return [`${base}/search/wines?q=${encodeURIComponent(firstQuery)}`];
}

async function fetchOffer(pdpUrl: string, source: PriceSource): Promise<NormalizedOffer | null> {
  const { text, ok } = await fetchWithRetries(pdpUrl, {
    timeoutMs: 12_000,
    maxRetries: 2,
    headers: { "User-Agent": BROWSER_UA },
  });
  if (!ok || !text) return null;
  return parsePdpHtml(text, pdpUrl);
}

export const vivinoAdapter: SourceAdapter = {
  searchCandidates,
  fetchOffer,
};
