import type { AppLocale } from "@/lib/i18n/locale";
import { NATURAL_VS_ORGANIC_PATH } from "@/lib/guides/articles/natural-vs-organic-vs-biodynamic-wine";
import { BILINGUAL_GUIDE_SLUG_PAIRS } from "@/lib/guides/bilingual-guide-slug-pairs";
import { GUIDE_PATHS } from "@/lib/guides/guide-routes";

/** English-only guides: no Swedish twin; stay on the EN URL when switching. */
const ENGLISH_ONLY_GUIDE_PATHS = new Set<string>([NATURAL_VS_ORGANIC_PATH]);

/**
 * Map /guides ↔ /guider (hub + bilingual articles + worlds-best lists)
 * when the user switches locale in the header.
 */
export function switchGuidePath(
  pathname: string,
  newLocale: AppLocale,
): string | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  for (const key of Object.keys(GUIDE_PATHS) as (keyof typeof GUIDE_PATHS)[]) {
    const paths = GUIDE_PATHS[key];
    if (normalized === paths.en || normalized === paths.sv) {
      return paths[newLocale];
    }
  }

  const enMatch = normalized.match(/^\/guides\/([^/]+)$/);
  const svMatch = normalized.match(/^\/guider\/([^/]+)$/);
  const slug = enMatch?.[1] ?? svMatch?.[1];
  if (!slug) return null;

  const pathLocale: AppLocale | null = enMatch
    ? "en"
    : svMatch
      ? "sv"
      : null;
  if (!pathLocale || pathLocale === newLocale) return null;

  if (enMatch && ENGLISH_ONLY_GUIDE_PATHS.has(normalized)) {
    // Keep readers on the English page rather than inventing a /guider twin.
    return null;
  }

  const pair = BILINGUAL_GUIDE_SLUG_PAIRS.find(
    (p) => p.en === slug || p.sv === slug,
  );
  if (pair) {
    return newLocale === "en" ? `/guides/${pair.en}` : `/guider/${pair.sv}`;
  }

  // Unknown guide with parallel folder names — swap prefix only.
  return newLocale === "en" ? `/guides/${slug}` : `/guider/${slug}`;
}
