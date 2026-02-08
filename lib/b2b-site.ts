/**
 * B2B site detection: dirtywine.se vs pactwines.com (B2C).
 * Used for stock availability, add-to-cart, etc.
 */
export function isB2BHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  return (
    h.includes("dirtywine.se") ||
    (process.env.NEXT_PUBLIC_LOCAL_AS_DIRTYWINE === "1" &&
      (h === "localhost" || h === "127.0.0.1"))
  );
}
