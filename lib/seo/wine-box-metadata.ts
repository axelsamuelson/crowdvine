import type { AppLocale } from "@/lib/i18n/locale";

const DEFAULT_META_SV =
  "Naturvinslåda med sex flaskor från samma producent. Hemleverans med Budbee.";
const DEFAULT_META_EN =
  "A natural wine box with six bottles from one producer. Home delivery with Budbee.";

/** SEO title without site suffix — layout template adds " | PACT Wines". */
export function buildWineBoxSeoTitle(
  boxName: string,
  locale: AppLocale,
): string {
  const name = boxName.trim() || (locale === "sv" ? "Naturvinlåda" : "Wine box");
  return locale === "sv"
    ? `${name} — naturvinlåda`
    : `${name} — natural wine box`;
}

export function buildWineBoxSeoDescription(
  locale: AppLocale,
  description?: string | null,
): string {
  const fromBox = description?.trim();
  if (fromBox) {
    if (fromBox.length <= 155) return fromBox;
    return `${fromBox.slice(0, 154).trimEnd()}…`;
  }
  return locale === "sv" ? DEFAULT_META_SV : DEFAULT_META_EN;
}
