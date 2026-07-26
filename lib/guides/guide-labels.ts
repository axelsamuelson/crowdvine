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

export function wineTypeLabel(sv: string, locale: "sv" | "en"): string {
  return locale === "en" ? (WINE_TYPE_EN[sv] ?? sv) : sv;
}