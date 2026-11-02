/**
 * PLP commerce-box touch reveal helpers.
 *
 * Real phones can disagree about (hover: none) vs (pointer: coarse). Gate on
 * either, plus an explicit "seen a touch" latch, so the first tap reveals the
 * box instead of navigating via the product link.
 */

export type MatchMediaFn = (query: string) => { matches: boolean };

export function isPlpTouchUi(
  media: MatchMediaFn = (q) => window.matchMedia(q),
  touchSeen = false,
): boolean {
  if (touchSeen) return true;
  try {
    return media("(hover: none)").matches || media("(pointer: coarse)").matches;
  } catch {
    return touchSeen;
  }
}

/** First tap on a touch UI: reveal only. Later taps may navigate / reserve. */
export function shouldInterceptPlpCardTap(opts: {
  isTouchUi: boolean;
  isRevealed: boolean;
}): boolean {
  return opts.isTouchUi && !opts.isRevealed;
}

/** Ignore finger-drags that are clearly scrolls, not taps. */
export function isTapGesture(
  start: { x: number; y: number } | null,
  end: { x: number; y: number },
  thresholdPx = 12,
): boolean {
  if (!start) return true;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return dx * dx + dy * dy <= thresholdPx * thresholdPx;
}
