/**
 * Adapter for WooCommerce (WordPress) stores (e.g. lieu-dit.dk).
 * Discovery: WordPress product search (?s=...&post_type=product), then sitemap fallback with /product/ URLs.
 * PDP: JSON-LD (schema.org/Product), then HTML fallback (WooCommerce price classes).
 */

import type { SourceAdapter } from "./base";
import type { NormalizedOffer, PriceSource, WineForMatch } from "../types";
import { fetchWithCache, fetchWithRetries, delay } from "../fetch-with-retries";
import { buildQueryPack } from "../query-pack";

const MAX_CANDIDATES_TOTAL = 12;
const JSON_LD_PRODUCT_TYPE = "https://schema.org/Product";

/** Lieu-dit and some WooCommerce sites use /en/shop/ or /shop/ for products, not /product/. */
function isProductUrl(url: string): boolean {
  return url.includes("/product/") || url.includes("/shop/");
}

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

/** WooCommerce HTML: .woocommerce-Price-amount, bdi, meta og:price, etc. */
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
    // WooCommerce: <span class="woocommerce-Price-amount">...<bdi>360,00</bdi> DKK</span> or .price .amount
    const bdiMatch = html.match(/<bdi[^>]*>([0-9]+[.,][0-9]+)\s*<\/bdi>/i);
    const amountMatch = html.match(
      /woocommerce-Price-amount[^>]*>[\s\S]*?([0-9]+[.,][0-9]+)/i
    );
    const priceMatch = bdiMatch ?? amountMatch ?? html.match(/class="price"[^>]*>[\s\S]*?([0-9]+[.,][0-9]+)/i);
    if (priceMatch) priceAmount = parseFloat(priceMatch[1].replace(",", "."));
  }

  let currency = "SEK";
  const currencyMeta = html.match(
    /<meta[^>]*property\s*=\s*["']og:price:currency["'][^>]*content\s*=\s*["']([^"']+)["']/i
  );
  if (currencyMeta) currency = currencyMeta[1];
  if (/\bDKK\b/i.test(html) && currency === "SEK") currency = "DKK";

  let available = true;
  if (/out of stock|udsolgt|sold out/i.test(html)) available = false;

  return {
    priceAmount: priceAmount ?? null,
    currency,
    available,
    titleRaw: title || "Unknown",
    pdpUrl,
  };
}

/** Extract product URLs from WooCommerce search results: href to /product/ or /shop/..., or canonical/og:url when single-product redirect. */
function extractProductUrlsFromSearchHtml(html: string, base: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const baseClean = base.replace(/\/$/, "");

  const hrefRegex = /href\s*=\s*["']([^"']*(?:\/product\/|\/shop\/)[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    let path = m[1].trim();
    if (path.startsWith("/")) path = baseClean + path;
    else if (!path.startsWith("http")) path = baseClean + "/" + path.replace(/^\//, "");
    try {
      const u = new URL(path);
      if (!isProductUrl(u.pathname)) continue;
      const key = u.origin + u.pathname.replace(/\/+$/, "");
      if (!seen.has(key)) {
        seen.add(key);
        urls.push(u.toString().replace(/\/+$/, "") || u.toString());
      }
    } catch {
      // skip
    }
  }

  if (urls.length === 0) {
    const canonicalMatch = html.match(/<link[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i)
      || html.match(/href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["']/i);
    const ogUrlMatch = html.match(/<meta[^>]*property\s*=\s*["']og:url["'][^>]*content\s*=\s*["']([^"']+)["']/i);
    const productUrl = canonicalMatch?.[1]?.trim() || ogUrlMatch?.[1]?.trim();
    if (productUrl && isProductUrl(productUrl)) {
      try {
        const u = new URL(productUrl);
        urls.push(u.toString().replace(/\/+$/, "") || u.toString());
      } catch {
        // skip
      }
    }
  }

  return urls;
}

/** Fetch sitemap and return product URLs (/product/ or /shop/). */
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
    if (isProductUrl(loc)) {
      try {
        const u = new URL(loc);
        urls.push(u.toString().replace(/\/+$/, "") || u.toString());
      } catch {
        // skip
      }
    }
  }

  if (urls.length === 0 && text.includes("sitemap") && text.includes("<loc>")) {
    const childSitemaps: string[] = [];
    const childRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
    while ((m = childRegex.exec(text)) !== null) {
      const loc = m[1].trim();
      if (loc.endsWith(".xml") && (loc.includes("product") || loc.includes("shop") || loc.includes("sitemap"))) {
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

/** WooCommerce product search: ?s=...&post_type=product. Uses fetchWithRetries to get final URL (redirect = single product). */
async function fetchSearchCandidates(wine: WineForMatch, source: PriceSource): Promise<string[]> {
  const base = source.base_url.replace(/\/$/, "");
  const queries = buildQueryPack(wine);
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const q of queries) {
    const searchUrl = `${base}/?s=${encodeURIComponent(q)}&post_type=product`;
    const { text, ok, url: finalUrl } = await fetchWithRetries(searchUrl, {
      timeoutMs: 12_000,
      maxRetries: 2,
    });
    if (!ok || !text) continue;
    if (finalUrl && isProductUrl(finalUrl)) {
      const u = finalUrl.replace(/\/+$/, "") || finalUrl;
      if (!seen.has(u)) {
        seen.add(u);
        urls.push(u);
      }
      if (urls.length >= MAX_CANDIDATES_TOTAL) return urls;
    }
    const extracted = extractProductUrlsFromSearchHtml(text, base);
    for (const u of extracted) {
      const key = u.replace(/\?.*/, "").replace(/\/+$/, "");
      if (!seen.has(key)) {
        seen.add(key);
        urls.push(u);
      }
      if (urls.length >= MAX_CANDIDATES_TOTAL) return urls;
    }
    await delay(source.rate_limit_delay_ms ?? 500);
  }
  return urls;
}

export const woocommerceAdapter: SourceAdapter = {
  async searchCandidates(wine: WineForMatch, source: PriceSource): Promise<string[]> {
    const base = source.base_url.replace(/\/$/, "");

    const fromSearch = await fetchSearchCandidates(wine, source);
    if (fromSearch.length > 0) return fromSearch;

    const sitemapUrl = source.sitemap_url?.trim() || `${base}/sitemap.xml`;
    const sitemapUrls = await getProductUrlsFromSitemap(sitemapUrl, base, MAX_CANDIDATES_TOTAL);
    return sitemapUrls;
  },

  async fetchOffer(pdpUrl: string, source: PriceSource): Promise<NormalizedOffer | null> {
    const delayMs = source.rate_limit_delay_ms ?? 2000;
    await delay(delayMs);

    const { text, ok } = await fetchWithCache(pdpUrl, {
      timeoutMs: 12_000,
      maxRetries: 2,
    });
    if (!ok || !text) return null;

    const fromJsonLd = parseJsonLdProduct(text, pdpUrl);
    if (fromJsonLd) return fromJsonLd;
    return parseHtmlFallback(text, pdpUrl);
  },
};
