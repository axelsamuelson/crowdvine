import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSuggestResponse, parseProductJs } from "../adapters/shopify-like";

/**
 * Parse JSON-LD from HTML (same logic as shopify-like adapter, inlined for testing).
 */
function parseJsonLdProduct(html: string, pdpUrl: string): { priceAmount: number | null; currency: string; available: boolean; titleRaw: string } | null {
  const scriptMatch = html.match(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!scriptMatch) return null;
  for (const block of scriptMatch) {
    const contentMatch = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const raw = contentMatch?.[1]?.trim();
    if (!raw) continue;
    try {
      let data = JSON.parse(raw) as { "@type"?: string; name?: string; offers?: unknown };
      const type = data["@type"];
      if (type !== "Product" && type !== "https://schema.org/Product") continue;
      const name = data.name ?? "";
      const offers = data.offers;
      let priceAmount: number | null = null;
      let currency = "SEK";
      let available = true;
      if (offers) {
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (offer && typeof offer === "object") {
          const o = offer as { price?: number; priceCurrency?: string; availability?: string };
          if (typeof o.price === "number") priceAmount = o.price;
          else if (typeof o.price === "string") priceAmount = parseFloat(o.price);
          if (typeof o.priceCurrency === "string") currency = o.priceCurrency;
          if (typeof o.availability === "string")
            available = !/soldout|outofstock/i.test(o.availability);
        }
      }
      return { priceAmount, currency, available, titleRaw: name };
    } catch {
      continue;
    }
  }
  return null;
}

describe("Shopify-like adapter parsing", () => {
  it("parses JSON-LD Product with Offer", () => {
    const html = readFileSync(
      join(__dirname, "fixtures", "shopify-pdp-jsonld.html"),
      "utf-8"
    );
    const result = parseJsonLdProduct(html, "https://example.com/product");
    expect(result).not.toBeNull();
    expect(result!.titleRaw).toBe("Domaine Leflaive Puligny-Montrachet 1er Cru 2020");
    expect(result!.priceAmount).toBe(899);
    expect(result!.currency).toBe("SEK");
    expect(result!.available).toBe(true);
  });

  it("returns null for HTML without JSON-LD Product", () => {
    const result = parseJsonLdProduct("<html><body>No schema</body></html>", "https://example.com");
    expect(result).toBeNull();
  });
});

describe("parseSuggestResponse", () => {
  it("parses suggest.json and returns product URLs", () => {
    const json = JSON.stringify({
      resources: {
        results: {
          products: [
            { url: "/products/domaine-leflaive-puligny", handle: "domaine-leflaive-puligny" },
            { url: "/products/other-wine", handle: "other-wine" },
          ],
        },
      },
    });
    const urls = parseSuggestResponse(json, "https://morenaturalwine.com");
    expect(urls.length).toBe(2);
    expect(urls[0]).toContain("/products/");
    expect(urls[0]).toMatch(/^https:\/\//);
  });

  it("uses handle when url missing", () => {
    const json = JSON.stringify({
      resources: { results: { products: [{ handle: "patrick-bouju-rouge" }] } },
    });
    const urls = parseSuggestResponse(json, "https://store.com");
    expect(urls).toContain("https://store.com/products/patrick-bouju-rouge");
  });

  it("returns empty array for invalid or empty JSON", () => {
    expect(parseSuggestResponse("", "https://x.com")).toEqual([]);
    expect(parseSuggestResponse("{}", "https://x.com")).toEqual([]);
  });
});

describe("parseProductJs", () => {
  it("parses Shopify product .js JSON into normalized offer", () => {
    const json = JSON.stringify({
      title: "Patrick Bouju Rouge 2022",
      vendor: "Patrick Bouju",
      variants: [
        { price: "24.00", available: true, option1: "750ml" },
      ],
    });
    const offer = parseProductJs(json, "https://store.com/products/patrick-bouju-rouge");
    expect(offer).not.toBeNull();
    expect(offer!.titleRaw).toBe("Patrick Bouju Rouge 2022");
    expect(offer!.vendor).toBe("Patrick Bouju");
    expect(offer!.priceAmount).toBe(24);
    expect(offer!.available).toBe(true);
    expect(offer!.size).toBe("750ml");
  });

  it("returns null for invalid JSON", () => {
    expect(parseProductJs("not json", "https://x.com")).toBeNull();
  });
});
