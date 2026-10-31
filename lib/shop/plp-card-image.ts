/**
 * PLP card image fit for aspect-[4/5] frames.
 *
 * object-cover crops height only when the source is *more portrait* than 4/5
 * (width/height < 0.8). All current shop label images are square (1:1), so cover
 * crops left/right only — cork and label stay intact. Wines that need contain
 * (with edge-sampled background, never gray) are listed in
 * {@link PLP_CONTAIN_IMAGE_BY_HANDLE}.
 */

export const PLP_CARD_ASPECT = 4 / 5;

/** Handles that would clip cork/label under object-cover in a 4/5 frame. */
export const PLP_CONTAIN_IMAGE_BY_HANDLE: Readonly<
  Record<string, { edgeColor: string }>
> = {
  // Populated after auditing shop label images. Currently empty: all 92
  // available_for_sale label images are square and safe with object-cover.
};

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
