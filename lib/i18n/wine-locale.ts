// Helper för att extrahera rätt språkversion från JSONB-fält
export type WineLocale = "sv" | "en";
export const DEFAULT_WINE_LOCALE: WineLocale = "sv";
export const SUPPORTED_WINE_LOCALES: WineLocale[] = ["sv", "en"];

const MAX_WINE_TEXT_UNWRAP_DEPTH = 8;

/** Unwrap locale JSONB (including accidentally double-nested `{ sv: { sv: "…" } }`). */
export function extractWineText(
  field: Record<string, string> | string | null | undefined,
  locale: WineLocale = DEFAULT_WINE_LOCALE,
): string | null {
  if (field == null) return null;

  let current: unknown = field;
  for (let depth = 0; depth < MAX_WINE_TEXT_UNWRAP_DEPTH; depth++) {
    if (current == null) return null;
    if (typeof current === "string") {
      const trimmed = current.trim();
      return trimmed || null;
    }
    if (typeof current !== "object" || Array.isArray(current)) return null;

    const obj = current as Record<string, unknown>;
    const next = obj[locale] ?? obj[DEFAULT_WINE_LOCALE];
    if (next === undefined) return null;
    current = next;
  }

  return null;
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
  const existingObj: Record<string, string> = {};
  if (existing != null) {
    for (const loc of SUPPORTED_WINE_LOCALES) {
      const text = extractWineText(existing, loc);
      if (text) existingObj[loc] = text;
    }
  }

  const trimmed = value?.trim();
  const merged = {
    ...existingObj,
    ...(trimmed ? { [locale]: trimmed } : {}),
  };

  return Object.keys(merged).length > 0 ? merged : null;
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
