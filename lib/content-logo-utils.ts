/** Resolve logo content key by host. dirtywine.se → _dirtywine; localhost and pactwines.com → _pact */
export function resolveLogoKeyByHost(
  baseKey: "header_logo" | "footer_logo" | "alternative_logo",
  host: string | null,
): string {
  if (!host) return `${baseKey}_pact`;
  const h = host.toLowerCase();
  if (h.includes("dirtywine.se")) return `${baseKey}_dirtywine`;
  return `${baseKey}_pact`;
}
