/**
 * Adapter for PrestaShop e-commerce sites (e.g. cavepurjus.com).
 * Discovery: search page (?controller=search&s= or /search?q=), extract product links (*-id.html).
 * PDP: JSON-LD (schema.org/Product), then HTML fallback (og:price, price in page).
 */

import type { SourceAdapter } from "./base";
import type { NormalizedOffer, PriceSource, WineForMatch } from "../types";
import { fetchWithCache, fetchWithRetries, delay } from "../fetch-with-retries";
import { buildQueryPack } from "../query-pack";

const MAX_CANDIDATES_TOTAL = 15;
const JSON_LD_PRODUCT_TYPE = "https://schema.org/Product";

function parseJsonLdProduct(html: string, pdpUrl: string): NormalizedOffer | null {
  const scriptMatch = html.match(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!scriptMatch) return null;

  for (const block of scriptMatch) {
    const contentMatch = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const raw = contentMatch?.[1]?.trim();
    if (!raw) continue;
    try {
      let data = JSON.parse(raw) as { "@type"?: string; "@graph"?: unknown[] };
      if (Array.isArray(data["@graph"])) {
        const product = data["@graph"].find(
          (item: { "@type"?: string }) =>
            item["@type"] === "Product" || item["@type"] === JSON_LD_PRODUCT_TYPE
        );
        if (product) data = product as typeof data;
      }
      const type = data["@type"];
      if (type !== "Product" && type !== JSON_LD_PRODUCT_TYPE) continue;

      const name = (data as { name?: string }).name ?? "";
      const offers = (data as { offers?: unknown }).offers;
      let priceAmount: number | null = null;
      let currency = "EUR";
      let available = true;

      if (offers) {
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (offer && typeof offer === "object") {
          const o = offer as {
            price?: number | string;
            priceCurrency?: string;
            availability?: string;
          };
          if (typeof o.price === "number") priceAmount = o.price;
          else if (typeof o.price === "string") priceAmount = parseFloat(o.price.replace(",", "."));
          if (typeof o.priceCurrency === "string") currency = o.priceCurrency;
          if (typeof o.availability === "string") {
            available = !/soldout|outofstock|out.of.stock/i.test(o.availability);
          }
        }
      }

      return {
        priceAmount,
        currency,
        available,
        titleRaw: name,
        pdpUrl,
      };
    } catch {
      continue;
    }
  }
  return null;
}

/** PrestaShop HTML: og:price:amount, or price in page (e.g. €14.50 or class="current-price"). */
function parseHtmlFallback(html: string, pdpUrl: string): NormalizedOffer | null {
  const titleMatch =
    html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").trim() : "";

  let priceAmount: number | null = null;
  const priceMeta = html.match(
    /<meta[^>]*property\s*=\s*["']og:price:amount["'][^>]*content\s*=\s*["']([^"']+)["']/i
  );
  if (priceMeta) priceAmount = parseFloat(priceMeta[1].replace(",", "."));
  if (priceAmount == null || isNaN(priceAmount)) {
    const currentPriceMatch = html.match(
      /class\s*=\s*["'][^"']*current-price[^"']*["'][^>]*>[\s\S]*?([0-9]+[.,][0-9]+)/i
    );
    const euroMatch = html.match(/€\s*([0-9]+[.,][0-9]+)/);
    const priceMatch = currentPriceMatch ?? euroMatch;
    if (priceMatch) priceAmount = parseFloat(priceMatch[1].replace(",", "."));
  }

  let currency = "EUR";
  const currencyMeta = html.match(
    /<meta[^>]*property\s*=\s*["']og:price:currency["'][^>]*content\s*=\s*["']([^"']+)["']/i
  );
  if (currencyMeta) currency = currencyMeta[1];
  if (/€|EUR/i.test(html) && currency === "EUR") currency = "EUR";

  let available = true;
  if (/out of stock|rupture|sold out|indisponible/i.test(html)) available = false;

  return {
    priceAmount: priceAmount ?? null,
    currency,
    available,
    titleRaw: title || "Unknown",
    pdpUrl,
  };
}

/** PrestaShop product URLs: /en/category/product-name-1.html or /category/product-name-42.html */
function extractProductUrlsFromSearchHtml(html: string, base: string): string[] {
  const seen = new Set<string>();
  const baseClean = base.replace(/\/$/, "");
  const urls: string[] = [];

  const hrefRegex = /href\s*=\s*["']([^"']*-[0-9]+\.html)(?:[?&#][^"']*)?["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    const path = m[1].trim();
    let fullUrl: string;
    if (path.startsWith("http")) {
      try {
        const u = new URL(path);
        if (!u.pathname.match(/-[0-9]+\.html$/)) continue;
        fullUrl = u.origin + u.pathname;
      } catch {
        continue;
      }
    } else {
      fullUrl = path.startsWith("/") ? baseClean + path : baseClean + "/" + path.replace(/^\//, "");
      try {
        new URL(fullUrl);
      } catch {
        continue;
      }
    }
    if (!seen.has(fullUrl)) {
      seen.add(fullUrl);
      urls.push(fullUrl);
    }
  }

  return urls;
}

/** Build search URL: PrestaShop uses /search?q= or ?controller=search&s= */
async function fetchSearchCandidates(
  wine: WineForMatch,
  source: PriceSource
): Promise<string[]> {
  const base = source.base_url.trim().replace(/\/$/, "");
  const queries = buildQueryPack(wine);
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const q of queries) {
    const searchUrl =
      source.search_url_template?.replace(/\{query\}/g, encodeURIComponent(q)).replace(/\{base_url\}/g, base) ??
      `${base}/search?q=${encodeURIComponent(q)}`;
    const { text, ok } = await fetchWithCache(searchUrl, {
      timeoutMs: 12_000,
      maxRetries: 2,
      cacheTtlMs: 5 * 60 * 1000,
    });
    if (!ok || !text) continue;
    const found = extractProductUrlsFromSearchHtml(text, base);
    for (const u of found) {
      if (!seen.has(u)) {
        seen.add(u);
        urls.push(u);
      }
      if (urls.length >= MAX_CANDIDATES_TOTAL) return urls;
    }
    await delay(source.rate_limit_delay_ms ?? 2000);
  }
  return urls;
}

export const prestashopAdapter: SourceAdapter = {
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

    const fromJsonLd = parseJsonLdProduct(text, pdpUrl);
    if (fromJsonLd) return fromJsonLd;
    return parseHtmlFallback(text, pdpUrl);
  },
};
