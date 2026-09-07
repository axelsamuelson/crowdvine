import { HIDDEN_PRODUCT_TAG } from "@/lib/constants";
import { isWineAvailableForSale } from "@/lib/wine-availability";

/**
 * Whether a PDP should be indexed — aligned with sitemap wine filtering
 * (`fetchIndexableWines`: live wine, available_for_sale, not hidden, live+active producer).
 * Offline/inactive producers are normally excluded earlier (product fetch returns null).
 */
export function isProductPdpIndexable(opts: {
  tags: string[];
  catalogAvailableForSale?: boolean | null;
  /** When known: producer must be live (same as sitemap). */
  producerIsLive?: boolean | null;
  /** When known: producer must be active (same as sitemap). */
  producerStatus?: string | null;
}): boolean {
  if (opts.tags.includes(HIDDEN_PRODUCT_TAG)) return false;
  if (!isWineAvailableForSale(opts.catalogAvailableForSale ?? true)) return false;
  if (opts.producerIsLive === false) return false;
  if (
    opts.producerStatus != null &&
    opts.producerStatus.trim() !== "" &&
    opts.producerStatus !== "active"
  ) {
    return false;
  }
  return true;
}
