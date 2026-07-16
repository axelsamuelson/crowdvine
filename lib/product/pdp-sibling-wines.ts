import type { Product } from "@/lib/shopify/types";

function normalizeColor(value: string | null | undefined): string {
  const c = (value ?? "").trim().toLowerCase();
  if (c.includes("red") || c.includes("rött") || c.includes("röd")) return "red";
  if (c.includes("white") || c.includes("vitt") || c.includes("vit")) return "white";
  if (c.includes("orange")) return "orange";
  if (c.includes("sparkling") || c.includes("mousserande")) return "sparkling";
  return c;
}

/**
 * Pick up to `limit` sibling wines from the same producer for PDP internal links.
 * Prefers same color as the current wine, then fills with other siblings.
 */
export function pickPdpSiblingWines(
  current: Product,
  sameProducerWines: Product[],
  limit = 3,
): Product[] {
  const siblings = sameProducerWines.filter(
    (w) => w.id !== current.id && w.handle !== current.handle,
  );
  if (siblings.length === 0) return [];

  const currentColor = normalizeColor(
    current.wineEnrichment?.color ??
      current.tags?.find((t) =>
        /red|white|orange|rosé|rose|sparkling|rött|vitt/i.test(t),
      ),
  );

  const sameColor = siblings.filter(
    (w) =>
      normalizeColor(
        w.wineEnrichment?.color ??
          w.tags?.find((t) =>
            /red|white|orange|rosé|rose|sparkling|rött|vitt/i.test(t),
          ),
      ) === currentColor && currentColor.length > 0,
  );
  const other = siblings.filter((w) => !sameColor.some((s) => s.id === w.id));

  return [...sameColor, ...other].slice(0, limit);
}
