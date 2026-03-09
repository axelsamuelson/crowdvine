/**
 * Shared currency extraction from PDP HTML.
 * Used by Shopify-like (when .js has no currency), WooCommerce, PrestaShop, Drupal, etc.
 */

const JSON_LD_PRODUCT_TYPE = "https://schema.org/Product";

/** Extract currency from PDP HTML (JSON-LD, meta, or heuristics). Returns ISO code (e.g. EUR) or null. */
export function extractCurrencyFromHtml(html: string): string | null {
  // 1) JSON-LD Product offers.priceCurrency
  const scriptMatch = html.match(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (scriptMatch) {
    for (const block of scriptMatch) {
      const contentMatch = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      const raw = contentMatch?.[1]?.trim();
      if (!raw) continue;
      try {
        let data = JSON.parse(raw) as { "@type"?: string; "@graph"?: unknown[]; offers?: unknown };
        if (Array.isArray(data["@graph"])) {
          const product = data["@graph"].find(
            (item: { "@type"?: string }) =>
              item["@type"] === "Product" || item["@type"] === JSON_LD_PRODUCT_TYPE
          );
          if (product) data = product as typeof data;
        }
        const offers = data.offers;
        if (offers) {
          const offer = Array.isArray(offers) ? offers[0] : offers;
          if (offer && typeof offer === "object") {
            const pc = (offer as { priceCurrency?: string }).priceCurrency;
            if (typeof pc === "string" && pc.length >= 2) return pc.trim().toUpperCase();
          }
        }
      } catch {
        continue;
      }
    }
  }
  // 2) Meta og:price:currency
  const currencyMeta = html.match(
    /<meta[^>]*property\s*=\s*["']og:price:currency["'][^>]*content\s*=\s*["']([^"']+)["']/i
  );
  if (currencyMeta) return currencyMeta[1].trim().toUpperCase();
  // 3) priceCurrency in JSON (e.g. in script)
  if (/["']priceCurrency["']\s*:\s*["']([A-Z]{3})["']/i.test(html)) {
    const m = html.match(/["']priceCurrency["']\s*:\s*["']([A-Z]{3})["']/i);
    if (m) return m[1].toUpperCase();
  }
  // 4) Meta itemprop priceCurrency (e.g. Lightspeed)
  const itempropCurrency = html.match(
    /<meta\s+[^>]*itemprop\s*=\s*["']priceCurrency["'][^>]*content\s*=\s*["']([^"']+)["']/i
  );
  if (itempropCurrency) return itempropCurrency[1].trim().toUpperCase();
  // 5) Heuristics from page content (order matters: more specific first)
  if (/\bEUR\b|€|,\d{2}\s*€/.test(html)) return "EUR";
  if (/\bGBP\b|£/.test(html)) return "GBP";
  if (/\bUSD\b|\$\s*\d/.test(html)) return "USD";
  if (/\bDKK\b|kr\.?\s*\d|,\d{2}\s*kr/i.test(html)) return "DKK";
  if (/\bSEK\b|kr\.?\s*\d|,\d{2}\s*kr/i.test(html)) return "SEK";
  return null;
}
