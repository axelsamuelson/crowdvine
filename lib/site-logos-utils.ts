export function logoUrlWithVersion(url: string, version?: string | number): string {
  if (version == null) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}
