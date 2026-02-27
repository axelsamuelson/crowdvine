export type { SourceAdapter } from "./base";
export { shopifyLikeAdapter } from "./shopify-like";
export { woocommerceAdapter } from "./woocommerce";

import type { PriceSource } from "../types";
import type { SourceAdapter } from "./base";
import { shopifyLikeAdapter } from "./shopify-like";
import { woocommerceAdapter } from "./woocommerce";

const registry: Record<string, SourceAdapter> = {
  shopify: shopifyLikeAdapter,
  woocommerce: woocommerceAdapter,
};

export function getAdapter(source: PriceSource): SourceAdapter {
  const adapter = registry[source.adapter_type];
  if (!adapter) {
    throw new Error(`Unknown adapter_type: ${source.adapter_type}. Supported: ${Object.keys(registry).join(", ")}`);
  }
  return adapter;
}
