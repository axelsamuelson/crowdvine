/**
 * B2B site detection: dirtywine.se vs pactwines.com (B2C).
 * Localhost is always treated as pactwines.com (B2C); use ?b2b=1 for B2B mode.
 */
export function isB2BHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  return h.includes("dirtywine.se");
}
