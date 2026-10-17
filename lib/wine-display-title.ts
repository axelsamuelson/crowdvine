/**
 * Title shown on shop product cards.
 * The vintage is appended unless the product name already ends with that year.
 */
export function wineDisplayTitle(
  wineName: string | null | undefined,
  vintage: string | number | null | undefined,
): string {
  const name = String(wineName ?? "").trim();
  const year = vintage == null ? "" : String(vintage).trim();
  if (!name) return year;
  if (!year) return name;
  if (name === year || name.endsWith(` ${year}`)) return name;
  return `${name} ${year}`;
}
