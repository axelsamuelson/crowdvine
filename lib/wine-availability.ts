/** Customer-facing purchasability (B2C list price / mixed case). */
export function isWineAvailableForSale(
  availableForSale: boolean | null | undefined,
): boolean {
  return availableForSale !== false;
}

/** Shop variant availability: B2B uses pallet stock; B2C uses available_for_sale. */
export function resolveProductAvailableForSale(opts: {
  isB2BSite: boolean;
  b2bStock: number | null | undefined;
  availableForSale?: boolean | null;
}): boolean {
  const catalogAvailable = isWineAvailableForSale(opts.availableForSale);
  if (opts.isB2BSite) {
    const stock = opts.b2bStock;
    return catalogAvailable && stock != null && stock > 0;
  }
  return catalogAvailable;
}
