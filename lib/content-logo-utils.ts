import { isDirtywineHost, isPactHost } from "@/lib/b2b-site";

/**
 * Resolves logo content key based on host (PACT vs Dirty Wine).
 * - dirtywine.se / localhost ?b2b=1 → _dirtywine suffix (B2B)
 * - pactwines.com / localhost (default) → _pact suffix (B2C)
 */
export function resolveLogoKeyByHost(
  baseKey: string,
  host: string | null,
  searchParams?: { get: (key: string) => string | null } | null,
): string {
  if (!host) return baseKey;

  const suffix = isDirtywineHost(host, searchParams)
    ? "_dirtywine"
    : isPactHost(host, searchParams)
      ? "_pact"
      : null;
  if (!suffix) return baseKey;

  const suffixKeys = ["header_logo", "footer_logo", "alternative_logo"];
  if (suffixKeys.includes(baseKey)) {
    return `${baseKey}${suffix}`;
  }
  return baseKey;
}
