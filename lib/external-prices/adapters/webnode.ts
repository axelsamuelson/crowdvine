/**
 * Adapter for Webnode 2 e-shop sites (e.g. june-caffe.com).
 * Discovery: fetch /e-shop/ (or search_url_template), extract product links href="/p/.../".
 * PDP: data-wnd_product_data JSON (price, name, out_of_stock), then HTML fallback (prd-price-c, og:title).
 */

import type { SourceAdapter } from "./base";
import type { NormalizedOffer, PriceSource, WineForMatch } from "../types";
import { fetchWithCache, fetchWithRetries, delay } from "../fetch-with-retries";
import { buildQueryPack } from "../query-pack";
import { extractCurrencyFromHtml } from "./currency-from-html";

const MAX_CANDIDATES_TOTAL = 20;

/** Extract product URLs from Webnode e-shop listing: href="/p/product-slug/" */
function extractProductUrlsFromHtml(html: string, base: string): string[] {
  const seen = new Set<string>();
  const baseClean = base.replace(/\/$/, "");
  const urls: string[] = [];
  const hrefRegex = /href\s*=\s*["'](\/p\/[^"']+\/)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    const path = m[1].trim();
    const fullUrl = baseClean + path;
    if (!seen.has(fullUrl)) {
      seen.add(fullUrl);
      urls.push(fullUrl);
    }
  }
  return urls;
}

/** Parse data-wnd_product_data JSON from Webnode PDP (HTML-entity encoded). */
function parseWndProductData(html: string, pdpUrl: string): NormalizedOffer | null {
  const match = html.match(/data-wnd_product_data\s*=\s*["']([^"']+)["']/i);
  if (!match) return null;
  try {
    const decoded = match[1]
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, "&");
    const data = JSON.parse(decoded) as {
      name?: string;
      price?: number;
      out_of_stock?: boolean;
      detail_url?: string;
    };
    const name = data.name ?? "";
    const priceAmount = typeof data.price === "number" ? data.price : null;
    const available = data.out_of_stock !== true;
    return {
      priceAmount,
      currency: "EUR",
      available,
      titleRaw: name || "Unknown",
      pdpUrl,
    };
  } catch {
    return null;
  }
}

/** Webnode HTML fallback: prd-price-c (e.g. 19,00), og:title. */
function parseHtmlFallback(html: string, pdpUrl: string): NormalizedOffer | null {
  const titleMatch =
    html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").trim() : "";

  let priceAmount: number | null = null;
  const prdPriceMatch = html.match(/class\s*=\s*["'][^"']*prd-price-c[^"']*["'][^>]*>([0-9]+[.,][0-9]+)/i);
  if (prdPriceMatch) priceAmount = parseFloat(prdPriceMatch[1].replace(",", "."));
  if (priceAmount == null || isNaN(priceAmount)) {
    const euroMatch = html.match(/([0-9]+[.,][0-9]+)\s*€/);
    if (euroMatch) priceAmount = parseFloat(euroMatch[1].replace(",", "."));
  }

  let available = true;
  if (/out_of_stock["']\s*:\s*true|indisponible|épuisé/i.test(html)) available = false;

  let currency = "EUR";
  const detectedCurrency = extractCurrencyFromHtml(html);
  if (detectedCurrency) currency = detectedCurrency;

  return {
    priceAmount: priceAmount ?? null,
    currency,
    available,
    titleRaw: title || "Unknown",
    pdpUrl,
  };
}

/** Fetch e-shop listing and optionally search; return product PDP URLs. */
async function fetchSearchCandidates(wine: WineForMatch, source: PriceSource): Promise<string[]> {
  const base = source.base_url.trim().replace(/\/$/, "");
  const queries = buildQueryPack(wine);
  const seen = new Set<string>();
  const allUrls: string[] = [];

  const eshopPath = "/e-shop/";
  const listingUrl = source.search_url_template
    ? source.search_url_template.replace(/\{query\}/g, queries[0] ?? "").replace(/\{base_url\}/g, base)
    : `${base}${eshopPath}`;

  const { text, ok } = await fetchWithCache(listingUrl, {
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

  if (allUrls.length >= MAX_CANDIDATES_TOTAL) return allUrls.slice(0, MAX_CANDIDATES_TOTAL);

  for (const q of queries.slice(1)) {
    const searchUrl = `${base}/search/?q=${encodeURIComponent(q)}`;
    const { text: searchText, ok: searchOk } = await fetchWithCache(searchUrl, {
      timeoutMs: 12_000,
      maxRetries: 1,
      cacheTtlMs: 5 * 60 * 1000,
    });
    if (searchOk && searchText) {
      const found = extractProductUrlsFromHtml(searchText, base);
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

export const webnodeAdapter: SourceAdapter = {
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

    const fromWnd = parseWndProductData(text, pdpUrl);
    if (fromWnd) {
      const detectedCurrency = extractCurrencyFromHtml(text);
      if (detectedCurrency) return { ...fromWnd, currency: detectedCurrency };
      return fromWnd;
    }
    return parseHtmlFallback(text, pdpUrl);
  },
};
