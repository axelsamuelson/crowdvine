/**
 * PLP card image fit for aspect-[4/5] frames.
 *
 * Prefer object-cover when the source is safe. Square (1:1) label photos zoom
 * under cover in a 4/5 frame and clip cork/label breathing room — those
 * handles use object-contain with an edge-sampled background (never gray).
 */

import { PLP_CONTAIN_IMAGE_BY_HANDLE } from "@/lib/shop/plp-contain-overrides";

export const PLP_CARD_ASPECT = 4 / 5;

export { PLP_CONTAIN_IMAGE_BY_HANDLE };

export function plpCardImageFit(handle: string): {
  objectFit: "cover" | "contain";
  edgeColor: string | null;
} {
  const override = PLP_CONTAIN_IMAGE_BY_HANDLE[handle];
  if (override) {
    return { objectFit: "contain", edgeColor: override.edgeColor };
  }
  return { objectFit: "cover", edgeColor: null };
}
