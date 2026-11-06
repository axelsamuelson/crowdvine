/**
 * Load direct_box carrier binding from env.
 * Empty / incomplete → null (fail closed). Never invents a commercial carrier
 * (e.g. does not imply Instabee eShipping or FR→SE linehaul is live).
 */

import type { DirectBoxCarrierConfig } from "@/lib/commerce/fulfillment-channel";

export function loadDirectBoxCarrierConfigFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DirectBoxCarrierConfig | null {
  const carrierId = String(env.DIRECT_BOX_CARRIER_ID ?? "").trim();
  const productCode = String(env.DIRECT_BOX_CARRIER_PRODUCT ?? "").trim();
  if (!carrierId || !productCode) return null;

  const countriesRaw = String(env.DIRECT_BOX_CARRIER_COUNTRIES ?? "SE").trim();
  const allowedCountryCodes = countriesRaw
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length === 2);

  const quotingEnabled =
    String(env.DIRECT_BOX_CARRIER_QUOTING_ENABLED ?? "")
      .trim()
      .toLowerCase() === "true";

  return {
    carrierId,
    productCode,
    allowedCountryCodes:
      allowedCountryCodes.length > 0 ? allowedCountryCodes : ["SE"],
    quotingEnabled,
  };
}
