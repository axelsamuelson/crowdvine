export type { SourceAdapter } from "./base";
export { shopifyLikeAdapter } from "./shopify-like";
export { woocommerceAdapter } from "./woocommerce";
export { prestashopAdapter } from "./prestashop";
export { webnodeAdapter } from "./webnode";
export { lightspeedAdapter } from "./lightspeed";
export { drupalAdapter } from "./drupal";
export { vinSensibleAdapter } from "./vin-sensible";
export { vivinoAdapter } from "./vivino";

import type { PriceSource } from "../types";
import type { SourceAdapter } from "./base";
import { shopifyLikeAdapter } from "./shopify-like";
import { woocommerceAdapter } from "./woocommerce";
import { prestashopAdapter } from "./prestashop";
import { webnodeAdapter } from "./webnode";
import { lightspeedAdapter } from "./lightspeed";
import { drupalAdapter } from "./drupal";
import { vinSensibleAdapter } from "./vin-sensible";
import { vivinoAdapter } from "./vivino";

const registry: Record<string, SourceAdapter> = {
  shopify: shopifyLikeAdapter,
  woocommerce: woocommerceAdapter,
  prestashop: prestashopAdapter,
  webnode: webnodeAdapter,
  lightspeed: lightspeedAdapter,
  drupal: drupalAdapter,
  vin_sensible: vinSensibleAdapter,
  vivino: vivinoAdapter,
};

export function getAdapter(source: PriceSource): SourceAdapter {
  const adapter = registry[source.adapter_type];
  if (!adapter) {
    throw new Error(`Unknown adapter_type: ${source.adapter_type}. Supported: ${Object.keys(registry).join(", ")}`);
  }
  return adapter;
}
