/**
 * Adapter for Shopify-style e-commerce sites (e.g. morenaturalwine.com, primalwine.com).
 * Discovery: predictive search (suggest.json) with query-pack, then sitemap fallback.
 * PDP: try .js product JSON first, then JSON-LD, then HTML fallback.
 */

import type { SourceAdapter } from "./base";
import type { NormalizedOffer, PriceSource, WineForMatch } from "../types";
import { fetchWithCache, fetchWithRetries, delay } from "../fetch-with-retries";
import { buildQueryPack } from "../query-pack";

/** Per-source cache: URL -> normalized offer. Filled when using sitemap fallback. */
const sitemapOfferCache = new Map<string, Map<string, NormalizedOffer>>();

const MAX_SITEMAP_PRODUCTS = 200;
const MAX_CANDIDATES_TOTAL = 30;
const SUGGEST_LIMIT = 10;

const JSON_LD_PRODUCT_TYPE = "https://schema.org/Product";
const JSON_LD_OFFERS_TYPE = "https://schema.org/Offer";

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
      let currency = "SEK";
      let available = true;

      if (offers) {
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (offer && typeof offer === "object") {
          const o = offer as {
            price?: number;
            priceCurrency?: string;
            availability?: string;
          };
          if (typeof o.price === "number") priceAmount = o.price;
          else if (typeof o.price === "string") priceAmount = parseFloat(o.price);
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

/** Parse Shopify product .js JSON (e.g. /products/foo.js). Returns normalized offer with vendor/size when present. */
export function parseProductJs(jsonText: string, pdpUrl: string): NormalizedOffer | null {
  try {
    const data = JSON.parse(jsonText) as {
      title?: string;
      vendor?: string;
      variants?: Array<{
        price?: string | number;
        available?: boolean;
        option1?: string;
        option2?: string;
      }>;
    };
    const title = data.title ?? "";
    const vendor = data.vendor ?? null;
    const variants = Array.isArray(data.variants) ? data.variants : [];
    const v = variants[0];
    let priceAmount: number | null = null;
    let available = true;
    let size: string | null = null;
    if (v) {
      if (typeof v.price === "number") priceAmount = v.price;
      else if (typeof v.price === "string") priceAmount = parseFloat(v.price);
      if (typeof v.available === "boolean") available = v.available;
      const opt = (v.option1 ?? "") || (v.option2 ?? "");
      if (opt && /\d+\s*(ml|cl)/i.test(opt)) size = opt;
    }
    return {
      priceAmount,
      currency: "SEK",
      available,
      titleRaw: title,
      pdpUrl,
      vendor: vendor ?? undefined,
      size: size ?? undefined,
    };
  } catch {
    return null;
  }
}

/** Parse Shopify predictive search suggest.json response → product URLs. */
export function parseSuggestResponse(jsonText: string, base: string): string[] {
  const baseClean = base.replace(/\/$/, "");
  const seen = new Set<string>();
  const urls: string[] = [];
  try {
    const data = JSON.parse(jsonText) as {
      resources?: { results?: { products?: Array<{ url?: string; handle?: string }> } };
    };
    const products = data.resources?.results?.products;
    if (!Array.isArray(products)) return [];
    for (const p of products) {
      const path = p.url ?? (p.handle ? `/products/${p.handle}` : null);
      if (!path) continue;
      const full = path.startsWith("http") ? path : baseClean + (path.startsWith("/") ? path : `/${path}`);
      try {
        const u = new URL(full);
        const key = u.origin + u.pathname;
        if (!seen.has(key)) {
          seen.add(key);
          urls.push(u.toString());
        }
      } catch {
        // skip
      }
    }
    return urls;
  } catch {
    return [];
  }
}

/** Fallback: meta og:price or common Shopify HTML selectors. */
function parseHtmlFallback(html: string, pdpUrl: string): NormalizedOffer | null {
  const titleMatch = html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i)
    || html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").trim() : "";

  let priceAmount: number | null = null;
  const priceMeta = html.match(/<meta[^>]*property\s*=\s*["']og:price:amount["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (priceMeta) priceAmount = parseFloat(priceMeta[1]);
  if (priceAmount == null || isNaN(priceAmount)) {
    const priceMatch = html.match(/data-product-price\s*=\s*["']([^"']+)["']/i)
      || html.match(/content\s*=\s*["']([0-9]+[.,][0-9]+)["'][^>]*itemprop\s*=\s*["']price["']/i)
      || html.match(/itemprop\s*=\s*["']price["'][^>]*content\s*=\s*["']([0-9]+[.,][0-9]+)["']/i);
    if (priceMatch) priceAmount = parseFloat(priceMatch[1].replace(",", "."));
  }

  let currency = "SEK";
  const currencyMeta = html.match(/<meta[^>]*property\s*=\s*["']og:price:currency["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (currencyMeta) currency = currencyMeta[1];

  let available = true;
  if (/sold.out|out.of.stock|add.to.cart|buy.now/i.test(html)) {
    available = !/sold.out|out.of.stock|currently.unavailable/i.test(html);
  }

  return {
    priceAmount: priceAmount ?? null,
    currency,
    available,
    titleRaw: title || "Unknown",
    pdpUrl,
  };
}

/** Extract product URLs from HTML: href="/products/...", href="https://.../products/...", or JSON-like "/products/..." */
function extractProductUrlsFromHtml(html: string, base: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  // 1) Classic href with relative or absolute path
  const hrefRegex = /href\s*=\s*["']([^"']*\/products\/[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    let path = m[1].trim();
    if (path.startsWith("/")) path = base + path;
    else if (!path.startsWith("http")) path = base + "/" + path.replace(/^\//, "");
    try {
      const u = new URL(path);
      u.searchParams.sort();
      const key = u.origin + u.pathname;
      if (!seen.has(key)) {
        seen.add(key);
        urls.push(u.toString());
      }
    } catch {
      // skip
    }
  }

  // 2) Full URL in href or in JSON (e.g. "url":"https://.../products/...")
  const fullUrlRegex = /(?:href\s*=\s*["']|["'](?:url|href)["']\s*:\s*["'])(https?:\/\/[^"']*\/products\/[^"']*)/gi;
  while ((m = fullUrlRegex.exec(html)) !== null) {
    try {
      const u = new URL(m[2].trim());
      if (!u.pathname.includes("/products/")) continue;
      u.searchParams.sort();
      const key = u.origin + u.pathname;
      if (!seen.has(key)) {
        seen.add(key);
        urls.push(u.toString());
      }
    } catch {
      // skip
    }
  }

  return urls;
}

/** Fetch sitemap (index or single) and return product <loc> URLs. */
async function getProductUrlsFromSitemap(
  sitemapUrl: string,
  base: string,
  limit: number
): Promise<string[]> {
  const { text, ok } = await fetchWithRetries(sitemapUrl, { timeoutMs: 15_000, maxRetries: 2 });
  if (!ok || !text) return [];

  const urls: string[] = [];
  const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRegex.exec(text)) !== null && urls.length < limit) {
    const loc = m[1].trim();
    const isProduct =
      loc.includes("/products/") || loc.includes("/product/");
    if (isProduct) {
      try {
        new URL(loc);
        urls.push(loc);
      } catch {
        // skip invalid
      }
    }
  }

  // Sitemap index: child sitemaps (e.g. sitemap_products_1.xml)
  if (urls.length === 0 && text.includes("sitemap") && text.includes("<loc>")) {
    const childSitemaps: string[] = [];
    const childRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
    while ((m = childRegex.exec(text)) !== null) {
      const loc = m[1].trim();
      if (loc.endsWith(".xml") && (loc.includes("product") || loc.includes("sitemap"))) {
        childSitemaps.push(loc);
      }
    }
    for (const child of childSitemaps.slice(0, 5)) {
      const childUrls = await getProductUrlsFromSitemap(child, base, limit - urls.length);
      urls.push(...childUrls);
      if (urls.length >= limit) break;
    }
  }

  return urls.slice(0, limit);
}

/** Prime in-memory cache by fetching all product PDPs from sitemap (rate-limited). Called when search returns 0. */
async function primeSitemapCache(source: PriceSource): Promise<void> {
  const cacheKey = source.id;
  if (sitemapOfferCache.has(cacheKey)) return;

  const sitemapUrl = source.sitemap_url?.trim() || `${source.base_url.replace(/\/$/, "")}/sitemap.xml`;
  const base = source.base_url.replace(/\/$/, "");
  const productUrls = await getProductUrlsFromSitemap(sitemapUrl, base, MAX_SITEMAP_PRODUCTS);
  if (productUrls.length === 0) {
    sitemapOfferCache.set(cacheKey, new Map());
    return;
  }

  const cache = new Map<string, NormalizedOffer>();
  const delayMs = source.rate_limit_delay_ms ?? 2000;

  for (const url of productUrls) {
    await delay(delayMs);
    try {
      const { text, ok } = await fetchWithCache(url, { timeoutMs: 10_000, maxRetries: 1 });
      if (!ok || !text) continue;
      const offer = parseJsonLdProduct(text, url) ?? parseHtmlFallback(text, url);
      if (offer) cache.set(url, offer);
    } catch {
      // skip failed PDP
    }
  }

  sitemapOfferCache.set(cacheKey, cache);
}

/** Predictive search: GET suggest.json for each query in pack, merge product URLs. */
async function fetchSuggestCandidates(
  wine: WineForMatch,
  source: PriceSource
): Promise<string[]> {
  const base = source.base_url.replace(/\/$/, "");
  const queries = buildQueryPack(wine);
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const q of queries) {
    const suggestUrl = `${base}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=${SUGGEST_LIMIT}`;
    const { text, ok } = await fetchWithCache(suggestUrl, {
      timeoutMs: 10_000,
      maxRetries: 2,
      cacheTtlMs: 5 * 60 * 1000,
    });
    if (!ok) continue;
    const parsed = parseSuggestResponse(text, base);
    for (const u of parsed) {
      const key = u.replace(/\?.*/, "");
      if (!seen.has(key)) {
        seen.add(key);
        urls.push(u);
      }
      if (urls.length >= MAX_CANDIDATES_TOTAL) return urls;
    }
    await delay(300);
  }
  return urls;
}

export const shopifyLikeAdapter: SourceAdapter = {
  async searchCandidates(wine: WineForMatch, source: PriceSource): Promise<string[]> {
    const base = source.base_url.replace(/\/$/, "");

    const fromSuggest = await fetchSuggestCandidates(wine, source);
    if (fromSuggest.length > 0) return fromSuggest;

    await primeSitemapCache(source);
    const cache = sitemapOfferCache.get(source.id);
    if (cache && cache.size > 0) return Array.from(cache.keys());

    return [];
  },

  async fetchOffer(pdpUrl: string, source: PriceSource): Promise<NormalizedOffer | null> {
    const cached = sitemapOfferCache.get(source.id)?.get(pdpUrl);
    if (cached) return cached;

    const delayMs = source.rate_limit_delay_ms ?? 2000;
    await delay(delayMs);

    const jsUrl = pdpUrl.endsWith(".js") ? pdpUrl : pdpUrl.replace(/\/?$/, "") + ".js";
    const jsRes = await fetchWithCache(jsUrl, { timeoutMs: 10_000, maxRetries: 1 });
    if (jsRes.ok && jsRes.text) {
      const fromJs = parseProductJs(jsRes.text, pdpUrl);
      if (fromJs) return fromJs;
    }

    const { text, ok } = await fetchWithCache(pdpUrl, {
      timeoutMs: 10_000,
      maxRetries: 2,
    });
    if (!ok || !text) return null;

    const fromJsonLd = parseJsonLdProduct(text, pdpUrl);
    if (fromJsonLd) return fromJsonLd;
    return parseHtmlFallback(text, pdpUrl);
  },
};
