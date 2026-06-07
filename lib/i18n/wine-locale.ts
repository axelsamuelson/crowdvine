// Helper för att extrahera rätt språkversion från JSONB-fält
export type WineLocale = "sv" | "en";
export const DEFAULT_WINE_LOCALE: WineLocale = "sv";
export const SUPPORTED_WINE_LOCALES: WineLocale[] = ["sv", "en"];

export function extractWineText(
  field: Record<string, string> | string | null | undefined,
  locale: WineLocale = DEFAULT_WINE_LOCALE,
): string | null {
  if (!field) return null;
  if (typeof field === "string") return field || null;
  return field[locale] ?? field[DEFAULT_WINE_LOCALE] ?? null;
}

export function extractWineArray(
  field: Record<string, string[]> | string[] | null | undefined,
  locale: WineLocale = DEFAULT_WINE_LOCALE,
): string[] | null {
  if (!field) return null;
  if (Array.isArray(field)) return field.length > 0 ? field : null;
  const arr = field[locale] ?? field[DEFAULT_WINE_LOCALE] ?? null;
  return arr && arr.length > 0 ? arr : null;
}

export function buildWineJsonb(
  value: string | null | undefined,
  locale: WineLocale,
  existing?: Record<string, string> | string | null,
): Record<string, string> | null {
  if (!value && !existing) return null;

  // Normalisera existing — plain string → { sv: string }
  const existingObj: Record<string, string> =
    typeof existing === "string" && existing.length > 0
      ? { [DEFAULT_WINE_LOCALE]: existing }
      : typeof existing === "object" && existing !== null
        ? existing
        : {};

  return { ...existingObj, ...(value ? { [locale]: value } : {}) };
}

export function buildWineArrayJsonb(
  value: string[] | null | undefined,
  locale: WineLocale,
  existing?: Record<string, string[]> | string[] | null,
): Record<string, string[]> | null {
  if (!value && !existing) return null;

  // Normalisera existing — plain array → { sv: array }
  const existingObj: Record<string, string[]> =
    Array.isArray(existing) && existing.length > 0
      ? { [DEFAULT_WINE_LOCALE]: existing }
      : !Array.isArray(existing) &&
          typeof existing === "object" &&
          existing !== null
        ? existing
        : {};

  return { ...existingObj, ...(value ? { [locale]: value } : {}) };
}
