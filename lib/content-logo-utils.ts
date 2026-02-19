/**
 * Resolves logo content key based on host (PACT vs Dirty Wine).
 * - dirtywine.se → _dirtywine suffix (B2B)
 * - pactwines.com, localhost, 127.0.0.1 → _pact suffix (B2C)
 * - other → base key unchanged
 */
export function resolveLogoKeyByHost(
  baseKey: string,
  host: string | null,
): string {
  if (!host) return baseKey;

  const h = host.toLowerCase().split(":")[0];
  const isB2B = h.includes("dirtywine.se");
  const isPACT = h.includes("pactwines.com") || h === "localhost" || h === "127.0.0.1";

  const suffix = isB2B ? "_dirtywine" : isPACT ? "_pact" : null;
  if (!suffix) return baseKey;

  const suffixKeys = ["header_logo", "footer_logo", "alternative_logo"];
  if (suffixKeys.includes(baseKey)) {
    return `${baseKey}${suffix}`;
  }
  return baseKey;
}
