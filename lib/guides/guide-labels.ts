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
 * Swedish country names that appear inside a stored region string
 * but are not the country column (Sicilien is a region token).
 */
const REGION_TOKEN_EN: Record<string, string> = {
  ...COUNTRY_EN,
  Sicilien: "Sicily",
};

/** English pages: translate Swedish country tokens inside a region string. */
export function regionLabel(region: string, locale: "sv" | "en"): string {
  if (locale !== "en") return region;
  return region
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      return REGION_TOKEN_EN[trimmed] ?? trimmed;
    })
    .join(", ");
}

export function wineTypeLabel(sv: string, locale: "sv" | "en"): string {
  return locale === "en" ? (WINE_TYPE_EN[sv] ?? sv) : sv;
}