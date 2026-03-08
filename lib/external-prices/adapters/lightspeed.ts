/**
 * Adapter for Lightspeed / WebshopApp e-commerce sites (e.g. solnaturalwines.com).
 * Discovery: GET /search/?q=query, extract product links (*.html).
 * PDP: schema.org/Product microdata (itemprop price, priceCurrency, availability), then HTML fallback (product__price, og:title).
 */

import type { SourceAdapter } from "./base";
import type { NormalizedOffer, PriceSource, WineForMatch } from "../types";
import { fetchWithCache, fetchWithRetries, delay } from "../fetch-with-retries";
import { buildQueryPack } from "../query-pack";

const MAX_CANDIDATES_TOTAL = 20;

/** Extract product URLs from Lightspeed search/listing: href to *.html on same host. */
function extractProductUrlsFromHtml(html: string, base: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const baseOrigin = base.replace(/\/+$/, "");
  // Match href="https://www.solnaturalwines.com/product-slug.html" or href="/product-slug.html"
  const hrefRegex = /href\s*=\s*["'](https?:\/\/[^"']+\.html|(\/[^"']+\.html))["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    let fullUrl: string;
    const raw = m[1];
    if (raw.startsWith("http")) {
      fullUrl = raw;
    } else {
      fullUrl = baseOrigin + (raw.startsWith("/") ? raw : `/${raw}`);
    }
    try {
      const u = new URL(fullUrl);
      if (u.origin !== new URL(baseOrigin).origin) continue;
      if (!u.pathname.endsWith(".html")) continue;
      if (!seen.has(fullUrl)) {
        seen.add(fullUrl);
        urls.push(fullUrl);
      }
    } catch {
      // skip invalid URL
    }
  }
  return urls;
}

/** Parse schema.org/Product microdata (itemprop price, priceCurrency, availability, name). */
function parseSchemaMicrodata(html: string, pdpUrl: string): NormalizedOffer | null {
  const nameMatch = html.match(/<meta\s+itemprop\s*=\s*["']name["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  const name = nameMatch ? decodeHtmlEntities(nameMatch[1]) : "";

  const priceMatch = html.match(/<meta\s+itemprop\s*=\s*["']price["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  const priceAmount = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : null;
  if (priceAmount == null || isNaN(priceAmount)) return null;

  const currencyMatch = html.match(/<meta\s+itemprop\s*=\s*["']priceCurrency["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  const currency = currencyMatch ? currencyMatch[1].toUpperCase() : "EUR";

  let available = true;
  const availMatch = html.match(/<meta\s+itemprop\s*=\s*["']availability["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (availMatch) {
    const v = availMatch[1];
    available = !/outofstock|out.of.stock|soldout|discontinued/i.test(v);
  }

  return {
    priceAmount,
    currency,
    available,
    titleRaw: name || "Unknown",
    pdpUrl,
  };
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Lightspeed HTML fallback: product__price (e.g. €19,50), og:title. */
function parseHtmlFallback(html: string, pdpUrl: string): NormalizedOffer | null {
  const titleMatch =
    html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : "";

  let priceAmount: number | null = null;
  const priceDivMatch = html.match(/class\s*=\s*["'][^"']*product__price[^"']*["'][^>]*>[\s€]*([0-9]+[.,][0-9]+)/i);
  if (priceDivMatch) priceAmount = parseFloat(priceDivMatch[1].replace(",", "."));
  if (priceAmount == null || isNaN(priceAmount)) {
    const prodCardMatch = html.match(/class\s*=\s*["'][^"']*prod-card__price[^"']*["'][^>]*>[\s€]*([0-9]+[.,][0-9]+)/i);
    if (prodCardMatch) priceAmount = parseFloat(prodCardMatch[1].replace(",", "."));
  }
  if (priceAmount == null || isNaN(priceAmount)) {
    const euroMatch = html.match(/€\s*([0-9]+[.,][0-9]+)/);
    if (euroMatch) priceAmount = parseFloat(euroMatch[1].replace(",", "."));
  }

  return {
    priceAmount: priceAmount ?? null,
    currency: "EUR",
    available: true,
    titleRaw: title || "Unknown",
    pdpUrl,
  };
}

async function fetchSearchCandidates(wine: WineForMatch, source: PriceSource): Promise<string[]> {
  const base = source.base_url.trim().replace(/\/+$/, "");
  const queries = buildQueryPack(wine);
  const seen = new Set<string>();
  const allUrls: string[] = [];

  const searchBase = `${base}/search/`;
  for (const q of queries) {
    const searchUrl = source.search_url_template
      ? source.search_url_template.replace(/\{query\}/g, q).replace(/\{base_url\}/g, base)
      : `${searchBase}?q=${encodeURIComponent(q)}`;

    const { text, ok } = await fetchWithCache(searchUrl, {
      timeoutMs: 12_000,
      maxRetries: 2,
      cacheTtlMs: 5 * 60 * 1000,
    });

    if (ok && text) {
      const found = extractProductUrlsFromHtml(text, base);
      for (const u of found) {
        if (!seen.has(u)) {
          seen.add(u);
          allUrls.push(u);
        }
      }
    }
    await delay(source.rate_limit_delay_ms ?? 2000);
    if (allUrls.length >= MAX_CANDIDATES_TOTAL) break;
  }

  return allUrls.slice(0, MAX_CANDIDATES_TOTAL);
}

export const lightspeedAdapter: SourceAdapter = {
  async searchCandidates(wine: WineForMatch, source: PriceSource): Promise<string[]> {
    return fetchSearchCandidates(wine, source);
  },

  async fetchOffer(pdpUrl: string, source: PriceSource): Promise<NormalizedOffer | null> {
    const delayMs = source.rate_limit_delay_ms ?? 2000;
    await delay(delayMs);

    const { text, ok } = await fetchWithRetries(pdpUrl, {
      timeoutMs: 12_000,
      maxRetries: 2,
    });
    if (!ok || !text) return null;

    const fromSchema = parseSchemaMicrodata(text, pdpUrl);
    if (fromSchema) return fromSchema;
    return parseHtmlFallback(text, pdpUrl);
  },
};
