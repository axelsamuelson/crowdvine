/**
 * Adapter for Drupal / Drupal Commerce sites (e.g. hedonism.co.uk).
 * Discovery: GET /search?keys=query or search_url_template, extract product links.
 * PDP: JSON-LD schema.org/Product, then og:price:amount / og:title, then HTML fallback.
 * Note: Sites behind Cloudflare (e.g. hedonism.co.uk) may block server requests; use manual adapter selection.
 */

import type { SourceAdapter } from "./base";
import type { NormalizedOffer, PriceSource, WineForMatch } from "../types";
import { fetchWithCache, fetchWithRetries, delay } from "../fetch-with-retries";
import { buildQueryPack } from "../query-pack";
import { extractCurrencyFromHtml } from "./currency-from-html";

const MAX_CANDIDATES_TOTAL = 20;
const JSON_LD_PRODUCT_TYPE = "https://schema.org/Product";

/** Extract product-like URLs from Drupal search/listing: same origin, exclude nav/search/cart/account. */
function extractProductUrlsFromHtml(html: string, base: string): string[] {
  const seen = new Set<string>();
  const baseOrigin = base.replace(/\/+$/, "");
  let origin: string;
  try {
    origin = new URL(baseOrigin).origin;
  } catch {
    return [];
  }

  const skipPathPattern = /^\/(search|cart|checkout|account|user|login|logout|admin|node\/1)(?:\/|$|\?)/i;
  const hrefRegex = /href\s*=\s*["'](https?:\/\/[^"']*|\/[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    let fullUrl: string;
    const raw = m[1].trim();
    if (raw.startsWith("http")) fullUrl = raw;
    else fullUrl = baseOrigin + (raw.startsWith("/") ? raw : `/${raw}`);
    try {
      const u = new URL(fullUrl);
      if (u.origin !== origin) continue;
      const path = u.pathname.replace(/\/+$/, "") || "/";
      if (path === "/" || skipPathPattern.test(path)) continue;
      if (!seen.has(fullUrl)) seen.add(fullUrl);
    } catch {
      // skip
    }
  }
  return Array.from(seen);
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
      let currency = "GBP";
      let available = true;
      if (offers) {
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (offer && typeof offer === "object") {
          const o = offer as { price?: number | string; priceCurrency?: string; availability?: string };
          if (typeof o.price === "number") priceAmount = o.price;
          else if (typeof o.price === "string") priceAmount = parseFloat(o.price.replace(",", "."));
          if (typeof o.priceCurrency === "string") currency = o.priceCurrency;
          if (typeof o.availability === "string")
            available = !/soldout|outofstock|out.of.stock/i.test(o.availability);
        }
      }
      return { priceAmount, currency, available, titleRaw: name || "Unknown", pdpUrl };
    } catch {
      continue;
    }
  }
  return null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Drupal HTML fallback: og:price:amount, og:title, or price in body. */
function parseHtmlFallback(html: string, pdpUrl: string): NormalizedOffer | null {
  const titleMatch =
    html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : "";

  let priceAmount: number | null = null;
  const priceMeta = html.match(
    /<meta[^>]*property\s*=\s*["']og:price:amount["'][^>]*content\s*=\s*["']([^"']+)["']/i
  );
  if (priceMeta) priceAmount = parseFloat(priceMeta[1].replace(",", "."));
  if (priceAmount == null || isNaN(priceAmount)) {
    const poundMatch = html.match(/£\s*([0-9]+[.,][0-9]+)/);
    const euroMatch = html.match(/€\s*([0-9]+[.,][0-9]+)/);
    const numMatch = poundMatch ?? euroMatch ?? html.match(/([0-9]+[.,][0-9]{2})\s*(?:£|€|GBP|EUR)/);
    if (numMatch) priceAmount = parseFloat(numMatch[1].replace(",", "."));
  }

  let currency = "GBP";
  const currencyMeta = html.match(
    /<meta[^>]*property\s*=\s*["']og:price:currency["'][^>]*content\s*=\s*["']([^"']+)["']/i
  );
  if (currencyMeta) currency = currencyMeta[1].toUpperCase();
  if (/£|GBP/i.test(html) && !currencyMeta) currency = "GBP";
  if (/€|EUR/i.test(html) && !currencyMeta) currency = "EUR";
  const detectedCurrency = extractCurrencyFromHtml(html);
  if (detectedCurrency) currency = detectedCurrency;

  return {
    priceAmount: priceAmount ?? null,
    currency,
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

  const defaultSearchUrl = `${base}/search`;
  for (const q of queries) {
    const searchUrl = source.search_url_template
      ? source.search_url_template.replace(/\{query\}/g, q).replace(/\{base_url\}/g, base)
      : `${defaultSearchUrl}?keys=${encodeURIComponent(q)}`;

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

  return allUrls.slice(0, MAX_CANDIDATES_TOTAL);
}

export const drupalAdapter: SourceAdapter = {
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

    const fromJsonLd = parseJsonLdProduct(text, pdpUrl);
    if (fromJsonLd) return fromJsonLd;
    return parseHtmlFallback(text, pdpUrl);
  },
};
