/**
 * Auto-detect e-commerce platform from a store's base URL.
 * Fetches the homepage (or root) and looks for telltale signs of Shopify, WooCommerce, etc.
 */

import { fetchWithRetries } from "./fetch-with-retries";

export type DetectedPlatform = "shopify" | "woocommerce" | null;

const SHOPIFY_SIGNATURES = [
  /cdn\.shopify\.com/i,
  /Shopify\.theme\s*=/i,
  /"shopify"\s*:\s*true/i,
  /shopify\.com\/s\/[a-z]+\.js/i,
  /myshopify\.com/i,
  /shopify\.shop\s*=/i,
  /window\.Shopify\s*=/i,
];

const WOOCOMMERCE_SIGNATURES = [
  /wp-content\/plugins\/woocommerce/i,
  /"woocommerce-/i, // script/style handles
  /generator"[^>]*content="[^"]*WooCommerce/i,
  /class="[^"]*\bwoocommerce\b/i,
];

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return u.origin;
  } catch {
    return "";
  }
}

function detectFromHtml(html: string): DetectedPlatform {
  // Check Shopify first (strong, specific signals)
  for (const re of SHOPIFY_SIGNATURES) {
    if (re.test(html)) return "shopify";
  }
  // Then WooCommerce (WordPress + WooCommerce)
  for (const re of WOOCOMMERCE_SIGNATURES) {
    if (re.test(html)) return "woocommerce";
  }
  return null;
}

/**
 * Fetch the store URL and detect platform. Returns adapter_type string or null if unknown.
 */
export async function detectPlatform(baseUrl: string): Promise<DetectedPlatform> {
  const url = normalizeBaseUrl(baseUrl);
  if (!url) throw new Error("Ogiltig webbadress");

  const { ok, text } = await fetchWithRetries(url, {
    timeoutMs: 12_000,
    maxRetries: 2,
  });

  if (!ok || !text) return null;
  return detectFromHtml(text);
}
