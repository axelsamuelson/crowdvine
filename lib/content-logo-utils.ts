/** Resolve logo content key by host (domain). dirtywine.se + localhost → _dirtywine, else → _pact */
export function resolveLogoKeyByHost(
  baseKey: "header_logo" | "footer_logo",
  host: string | null,
): string {
  if (!host) return `${baseKey}_pact`;
  const h = host.toLowerCase();
  if (h.includes("dirtywine.se") || h === "localhost" || h === "127.0.0.1")
    return `${baseKey}_dirtywine`;
  return `${baseKey}_pact`;
}
