/**
 * Normalization for menu extraction – section names, countries, wine types, etc.
 */

import type { WineType } from "./types";

const COUNTRY_MAP: Record<string, string> = {
  Frankrike: "France",
  Italien: "Italy",
  Spanien: "Spain",
  Österrike: "Austria",
  Tyskland: "Germany",
  Portugal: "Portugal",
  Australien: "Australia",
  USA: "United States",
  Ungern: "Hungary",
  Sverige: "Sweden",
  Frankreich: "France",
  Italie: "Italy",
  Espagne: "Spain",
  Österreich: "Austria",
  Deutschland: "Germany",
  Australia: "Australia",
  "United States": "United States",
  Hungary: "Hungary",
  Sweden: "Sweden",
  France: "France",
  Italy: "Italy",
  Spain: "Spain",
  Austria: "Austria",
  Germany: "Germany",
};

export const KNOWN_COUNTRIES_NORMALIZED = new Set<string>(
  Object.values(COUNTRY_MAP)
);

const SECTION_MAP: Record<string, string> = {
  "husets vin": "house_wine",
  "alkoholfritt": "non_alcoholic",
  bubbel: "sparkling",
  vitt: "white",
  "orange/skin contact": "orange",
  "skin contact": "orange",
  orange: "orange",
  rosé: "rose",
  rose: "rose",
  rött: "red",
  red: "red",
  sött: "sweet",
  sweet: "sweet",
  "portvin/dessertvin": "fortified",
  portvin: "fortified",
  dessertvin: "fortified",
  fortified: "fortified",
};

const WINE_TYPE_MAP: Record<string, WineType> = {
  sparkling: "sparkling",
  white: "white",
  vitt: "white",
  orange: "orange",
  rose: "rose",
  rosé: "rose",
  red: "red",
  rött: "red",
  sweet: "sweet",
  sött: "sweet",
  fortified: "fortified",
  "non_alcoholic": "non_alcoholic",
  "non-alcoholic": "non_alcoholic",
  alkoholfritt: "non_alcoholic",
  unknown: "unknown",
};

export function normalizeWineType(raw: string | null): WineType {
  if (!raw?.trim()) return "unknown";
  const key = raw.trim().toLowerCase();
  return WINE_TYPE_MAP[key] ?? "unknown";
}

export function normalizeSectionName(raw: string): string {
  if (!raw?.trim()) return "unknown";
  const key = raw.trim().toLowerCase();
  return SECTION_MAP[key] ?? key.replace(/\s+/g, "_");
}

export function normalizeCountry(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const key = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return COUNTRY_MAP[trimmed] ?? COUNTRY_MAP[key] ?? trimmed;
}

export function normalizeAttributes(raw: string[]): string[] {
  const out = raw
    .map((a) => a?.trim?.())
    .filter(Boolean)
    .map((a) => String(a).toUpperCase());
  return [...new Set(out)];
}

export function normalizeVintage(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  const nv = /^n\.?\s*v\.?$/i;
  if (nv.test(t)) return "N.V.";
  return t;
}

export function normalizeCurrency(raw: string | null): string {
  if (!raw?.trim()) return "SEK";
  const u = raw.trim().toUpperCase();
  if (["SEK", "EUR", "USD", "GBP", "NOK", "DKK"].includes(u)) return u;
  return "SEK";
}
