/**
 * Adapter for Vin Sensible custom boutique (boutique.vin-sensible.fr).
 * Discovery: fetch homepage/category, extract product links href="/produit/...".
 * PDP: parse span id="product-price-XXX">XX€, title from .product-name or h1/h2.
 */

import type { SourceAdapter } from "./base";
import type { NormalizedOffer, PriceSource, WineForMatch } from "../types";
import { fetchWithCache, fetchWithRetries, delay } from "../fetch-with-retries";
import { buildQueryPack } from "../query-pack";

const MAX_CANDIDATES_TOTAL = 20;

/** Extract product URLs: href="/produit/slug" or href="base/produit/slug". */
function extractProductUrlsFromHtml(html: string, base: string): string[] {
  const seen = new Set<string>();
  const baseClean = base.replace(/\/+$/, "");
  const hrefRegex = /href\s*=\s*["'](\/produit\/[^"']+|https?:\/\/[^"']*\/produit\/[^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    const raw = m[1].trim();
    const fullUrl = raw.startsWith("http") ? raw : baseClean + (raw.startsWith("/") ? raw : `/${raw}`);
    if (!seen.has(fullUrl)) {
      seen.add(fullUrl);
    }
  }
  return Array.from(seen);
}

/** Parse first product price: id="product-price-123">17€< or >32€< */
function parsePrice(html: string): number | null {
  const match = html.match(/id\s*=\s*["']product-price-\d+["'][^>]*>([^<]*?)€/i);
  if (!match) return null;
  const s = match[1].replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Parse product name: .product-name or first meaningful heading. */
function parseTitle(html: string): string {
  const nameMatch = html.match(/class\s*=\s*["'][^"']*product-name[^"']*["'][^>]*>([^<]+)</i);
  if (nameMatch) return nameMatch[1].replace(/&amp;/g, "&").trim();
  const h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
  if (h2Match) return h2Match[1].replace(/&amp;/g, "&").trim();
  const ogTitle = html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (ogTitle) return ogTitle[1].replace(/&amp;/g, "&").trim();
  return "Unknown";
}

async function fetchSearchCandidates(wine: WineForMatch, source: PriceSource): Promise<string[]> {
  const base = source.base_url.trim().replace(/\/+$/, "");
  const queries = buildQueryPack(wine);
  const seen = new Set<string>();
  const allUrls: string[] = [];

  for (const q of queries) {
    const searchUrl = source.search_url_template
      ? source.search_url_template.replace(/\{query\}/g, q).replace(/\{base_url\}/g, base)
      : `${base}/?q=${encodeURIComponent(q)}`;

    const { text, ok } = await fetchWithCache(searchUrl, {
      timeoutMs: 15_000,
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

  if (allUrls.length === 0) {
    const { text, ok } = await fetchWithCache(base, {
      timeoutMs: 15_000,
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
  }

  return allUrls.slice(0, MAX_CANDIDATES_TOTAL);
}

export const vinSensibleAdapter: SourceAdapter = {
  async searchCandidates(wine: WineForMatch, source: PriceSource): Promise<string[]> {
    return fetchSearchCandidates(wine, source);
  },

  async fetchOffer(pdpUrl: string, source: PriceSource): Promise<NormalizedOffer | null> {
    const delayMs = source.rate_limit_delay_ms ?? 2000;
    await delay(delayMs);

    const { text, ok } = await fetchWithRetries(pdpUrl, {
      timeoutMs: 15_000,
      maxRetries: 2,
    });
    if (!ok || !text) return null;

    const priceAmount = parsePrice(text);
    const titleRaw = parseTitle(text);
    return {
      priceAmount: priceAmount ?? null,
      currency: "EUR",
      available: true,
      titleRaw: titleRaw || "Unknown",
      pdpUrl,
    };
  },
};
