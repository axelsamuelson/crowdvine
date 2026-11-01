/**
 * Decide whether a cart update should auto-open the drawer.
 *
 * - First observation in a page view: silent init (never open on load /
 *   hydrate / server refetch of an existing cart).
 * - Later updates: open only when total bottle count increased (user add).
 * Explicit opens (cart icon, `cart-open-request`) are handled separately.
 */
export function shouldAutoOpenCartOnQuantityChange(
  previousTotalQuantity: number | undefined,
  nextTotalQuantity: number,
): { shouldOpen: boolean; nextKnownQuantity: number } {
  if (previousTotalQuantity === undefined) {
    return { shouldOpen: false, nextKnownQuantity: nextTotalQuantity };
  }

  return {
    shouldOpen: nextTotalQuantity > previousTotalQuantity,
    nextKnownQuantity: nextTotalQuantity,
  };
}
