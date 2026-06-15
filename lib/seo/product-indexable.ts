import { HIDDEN_PRODUCT_TAG } from "@/lib/constants";
import { isWineAvailableForSale } from "@/lib/wine-availability";

/** Whether a PDP should be indexed — aligned with sitemap wine filtering. */
export function isProductPdpIndexable(opts: {
  tags: string[];
  catalogAvailableForSale?: boolean | null;
}): boolean {
  if (opts.tags.includes(HIDDEN_PRODUCT_TAG)) return false;
  if (!isWineAvailableForSale(opts.catalogAvailableForSale ?? true)) return false;
  return true;
}
