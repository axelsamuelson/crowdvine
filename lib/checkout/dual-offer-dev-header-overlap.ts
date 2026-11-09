/**
 * Geometry helpers for the /dev dual-offer review route.
 * Detects visual superposition of comparison text with the fixed site header band
 * (transparent MENY/PACT chrome) — not merely "scroll target below header".
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
 * True when any comparison-text rect overlaps the header band.
 * Used by review evidence to fail the old "scrollIntoView cleared Direct
 * heading but Shared avg-price still under MENY" failure mode.
 */
export function comparisonTextOverlapsHeaderBand(args: {
  headerBottom: number;
  viewportWidth: number;
  comparisonRects: RectLike[];
}): boolean {
  const band = headerBandRect(args.headerBottom, args.viewportWidth);
  if (band.bottom <= 0) return false;
  return args.comparisonRects.some((r) => rectsOverlap(r, band));
}
