/**
 * Auto-detect e-commerce platform from a store's base URL.
 * Fetches the homepage (or root) and looks for telltale signs of Shopify, WooCommerce, etc.
 */

import { fetchWithRetries } from "./fetch-with-retries";

export type DetectedPlatform = "shopify" | "woocommerce" | "prestashop" | "webnode" | "lightspeed" | "drupal" | "vin_sensible" | "vivino" | null;

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

const PRESTASHOP_SIGNATURES = [
  /\bvar\s+prestashop\s*=\s*\{/i, // PrestaShop 1.7 global JS object (strongest signal)
  /"prestashop"\s*:\s*\{/i,
  /PrestaShop/i, // meta generator "Powered by ... PrestaShop" or content="PrestaShop"
  /\/modules\//i, // PrestaShop module paths (e.g. /modules/stthemeeditor/, /modules/trustpilot/)
];

const WEBNODE_SIGNATURES = [
  /name\s*=\s*["']generator["'][^>]*content\s*=\s*["']Webnode\s*2?["']/i,
  /content\s*=\s*["']Webnode\s*2?["'][^>]*name\s*=\s*["']generator/i,
  /\bwnd-eshop\b/i, // Webnode e-shop body class
  /data-wnd_product_data\s*=/i, // Webnode product JSON on PDP
];

const LIGHTSPEED_SIGNATURES = [
  /Lightspeed\s+Netherlands/i,
  /lightspeedhq\.com/i,
  /cdn\.webshopapp\.com/i,
  /id\s*=\s*["']lightspeedframe["']/i,
];

const DRUPAL_SIGNATURES = [
  /name\s*=\s*["']Generator["'][^>]*content\s*=\s*["']Drupal\s/i,
  /content\s*=\s*["']Drupal\s[^"']*["'][^>]*name\s*=\s*["']Generator/i,
  /data-drupal-[a-z-]+/i,
  /Drupal\.settings\s*=/i,
  /sites\/default\/files\//i,
  /\/sites\/[a-z0-9_]+\//i,
];

const VIN_SENSIBLE_SIGNATURES = [
  /product-price-\d+["']/i,
  /divBandeau|bandeau-cart/i,
  /Rechercher un produit/i,
];

/** Returns the URL to fetch for detection (full path as entered, so e.g. /en gets same page as user). */
function getUrlToFetch(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const withScheme = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const u = new URL(withScheme);
    const path = u.pathname && u.pathname !== "/" ? u.pathname : "/";
    return u.origin + path;
  } catch {
    return "";
  }
}

/** Host-based detection (no fetch): Vivino is a known wine site with custom frontend. */
function detectFromHost(baseUrl: string): DetectedPlatform {
  try {
    const withScheme = baseUrl.trim().startsWith("http") ? baseUrl.trim() : `https://${baseUrl.trim()}`;
    const u = new URL(withScheme);
    const host = (u.hostname || "").toLowerCase().replace(/^www\./, "");
    if (host === "vivino.com") return "vivino";
  } catch {
    /* ignore */
  }
  return null;
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
  // Then PrestaShop (e.g. cavepurjus.com)
  for (const re of PRESTASHOP_SIGNATURES) {
    if (re.test(html)) return "prestashop";
  }
  // Then Webnode (e.g. june-caffe.com)
  for (const re of WEBNODE_SIGNATURES) {
    if (re.test(html)) return "webnode";
  }
  // Then Lightspeed / WebshopApp (e.g. solnaturalwines.com)
  for (const re of LIGHTSPEED_SIGNATURES) {
    if (re.test(html)) return "lightspeed";
  }
  // Then Drupal / Drupal Commerce (e.g. hedonism.co.uk when not behind Cloudflare)
  for (const re of DRUPAL_SIGNATURES) {
    if (re.test(html)) return "drupal";
  }
  // Then Vin Sensible custom platform (boutique.vin-sensible.fr) – need 2+ signals
  const vinSensibleScore = VIN_SENSIBLE_SIGNATURES.filter((re) => re.test(html)).length;
  if (vinSensibleScore >= 2) return "vin_sensible";
  return null;
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BROWSER_ACCEPT =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";

/**
 * Fetch the store URL and detect platform. Returns adapter_type string or null if unknown.
 * Fetches the exact URL the user entered (including path, e.g. /en) so detection sees the same page.
 * Uses browser-like User-Agent and Accept so sites (e.g. cavepurjus.com) return full HTML.
 */
export async function detectPlatform(baseUrl: string): Promise<DetectedPlatform> {
  const url = getUrlToFetch(baseUrl);
  if (!url) throw new Error("Ogiltig webbadress");

  const fromHost = detectFromHost(baseUrl);
  if (fromHost) return fromHost;

  const { ok, text } = await fetchWithRetries(url, {
    timeoutMs: 12_000,
    maxRetries: 2,
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      Accept: BROWSER_ACCEPT,
    },
  });

  if (!ok || !text) return null;
  return detectFromHtml(text);
}
