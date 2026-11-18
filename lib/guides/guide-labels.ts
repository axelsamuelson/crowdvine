export const COUNTRY_EN: Record<string, string> = {
  "Frankrike": "France",
  "Italien": "Italy",
  "Österrike": "Austria",
  "Georgien": "Georgia",
  "Slovenien": "Slovenia",
  "Spanien": "Spain",
  "Tyskland": "Germany",
  "Portugal": "Portugal",
  "USA": "USA",
  "Tjeckien": "Czech Republic",
  "Australien": "Australia",
  "Sydafrika": "South Africa",
  "Chile": "Chile",
};

export const WINE_TYPE_EN: Record<string, string> = {
  "Rött": "Red",
  "Vitt": "White",
  "Orange": "Orange",
  "Champagne": "Champagne",
  "Mousserande": "Sparkling",
  "Rosé": "Rosé",
};

export function countryLabel(sv: string, locale: "sv" | "en"): string {
  return locale === "en" ? (COUNTRY_EN[sv] ?? sv) : sv;
}

/**
 * Swedish country and place names that appear inside a stored region string.
 * Sicilien and the place names below are not the country column.
 */
const REGION_TOKEN_EN: Record<string, string> = {
  ...COUNTRY_EN,
  Sicilien: "Sicily",
  Galicien: "Galicia",
  Kalifornien: "California",
  Katalonien: "Catalonia",
  Kanarieöarna: "Canary Islands",
};

/** Place names that can sit inside a comma-separated part, not only as the whole part. */
const REGION_PHRASE_EN = [
  ["Kanarieöarna", "Canary Islands"],
  ["Kalifornien", "California"],
  ["Katalonien", "Catalonia"],
  ["Galicien", "Galicia"],
] as const;

function translateRegionPart(part: string): string {
  const trimmed = part.trim();
  const exact = REGION_TOKEN_EN[trimmed];
  if (exact) return exact;
  let translated = trimmed;
  for (const [swedish, english] of REGION_PHRASE_EN) {
    translated = translated.replaceAll(swedish, english);
  }
  return translated;
}

/** English pages: translate Swedish country and place names inside a region string. */
export function regionLabel(region: string, locale: "sv" | "en"): string {
  if (locale !== "en") return region;
  return region
    .split(",")
    .map((part) => translateRegionPart(part))
    .join(", ");
}

export function wineTypeLabel(sv: string, locale: "sv" | "en"): string {
  return locale === "en" ? (WINE_TYPE_EN[sv] ?? sv) : sv;
}