/**
 * Resolve cart/checkout wine image URLs the same way PLP does:
 * storage paths → /api/images/…, missing/default → static /default-wine.png.
 * Never leave the UI on an empty src (avoids "Ingen bild" when checkout
 * already shows the default bottle).
 */

import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";

export function resolveWineImageSrc(
  path: string | null | undefined,
): string {
  if (path == null) return DEFAULT_WINE_IMAGE_PATH;

  const clean = String(path).trim().replace(/\n/g, "").split("?")[0] ?? "";
  if (!clean) return DEFAULT_WINE_IMAGE_PATH;

  if (
    clean === DEFAULT_WINE_IMAGE_PATH ||
    /(?:^|\/)default-wine\.png$/i.test(clean) ||
    /\/api\/images\/?(?:default-wine\.png)?$/i.test(clean)
  ) {
    return DEFAULT_WINE_IMAGE_PATH;
  }

  if (/^https?:\/\//i.test(clean)) {
    if (/\/api\/images\/?(?:default-wine\.png)?$/i.test(clean)) {
      return DEFAULT_WINE_IMAGE_PATH;
    }
    return clean;
  }

  if (clean.startsWith("/api/images/")) {
    const rest = clean.slice("/api/images/".length).trim();
    if (!rest || /^default-wine\.png$/i.test(rest)) {
      return DEFAULT_WINE_IMAGE_PATH;
    }
    return clean;
  }

  if (clean.startsWith("/uploads/")) {
    const fileName = clean.replace("/uploads/", "").trim();
    if (!fileName || /^default-wine\.png$/i.test(fileName)) {
      return DEFAULT_WINE_IMAGE_PATH;
    }
    return `/api/images/${fileName}`;
  }

  // Bare storage object key (no leading slash / uploads prefix).
  if (!clean.startsWith("/")) {
    if (/^default-wine\.png$/i.test(clean)) return DEFAULT_WINE_IMAGE_PATH;
    return `/api/images/${clean}`;
  }

  return clean;
}
