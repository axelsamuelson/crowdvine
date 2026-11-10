/**
 * Geometry helpers for the /dev dual-offer review route.
 * Detects visual superposition of comparison text with the fixed site header band
 * (transparent MENY/PACT chrome) — not merely "scroll target below header".
 *
 * Important: overflow-clipped content still has a full getBoundingClientRect that
 * can extend above the scrollport. Intersect with the visible scrollport first,
 * otherwise tall panels falsely trip the old e2e90c85 failure check.
 */

export type RectLike = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export function rectsOverlap(a: RectLike, b: RectLike, epsilon = 0.5): boolean {
  return !(
    a.right <= b.left + epsilon ||
    a.left >= b.right - epsilon ||
    a.bottom <= b.top + epsilon ||
    a.top >= b.bottom - epsilon
  );
}

export function intersectRects(
  a: RectLike,
  b: RectLike,
  epsilon = 0.5,
): RectLike | null {
  const top = Math.max(a.top, b.top);
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right - left <= epsilon || bottom - top <= epsilon) return null;
  return { top, left, right, bottom };
}

/** Header band covering [0, headerBottom] across the viewport width. */
export function headerBandRect(
  headerBottom: number,
  viewportWidth: number,
): RectLike {
  return {
    top: 0,
    left: 0,
    right: viewportWidth,
    bottom: Math.max(0, headerBottom),
  };
}

/**
 * True when any comparison-text rect, after clipping to the visible scrollport,
 * overlaps the header band. This catches the e2e90c85 failure mode (Shared
 * avg-price under MENY at intermediate scroll) without false positives from
 * overflow-clipped ancestors.
 */
export function comparisonTextOverlapsHeaderBand(args: {
  headerBottom: number;
  viewportWidth: number;
  scrollportRect: RectLike;
  comparisonRects: RectLike[];
}): boolean {
  const band = headerBandRect(args.headerBottom, args.viewportWidth);
  if (band.bottom <= 0) return false;
  for (const r of args.comparisonRects) {
    const visible = intersectRects(r, args.scrollportRect);
    if (!visible) continue;
    if (rectsOverlap(visible, band)) return true;
  }
  return false;
}
