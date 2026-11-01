/**
 * End-of-formula rounding. Applied once to the channel total (SEK → öre).
 */
import type { RoundingMode } from "@/lib/pricing/types";

/**
 * Convert an unrounded SEK total into öre using the configured mode.
 *
 * - `round_ore` — B2C retail: nearest öre
 * - `round_sek` — B2B shop/inquiry: nearest whole SEK, as öre
 * - `none` — keep full precision (öre may be fractional)
 */
export function applyRounding(sekTotal: number, mode: RoundingMode): number {
  if (!Number.isFinite(sekTotal)) return 0;
  switch (mode) {
    case "round_ore":
      return Math.round(sekTotal * 100);
    case "round_sek":
      return Math.round(sekTotal) * 100;
    case "none":
      return sekTotal * 100;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
