/**
 * Unit price shown on the B2C PDP hero, so the six-bottle total uses the same number.
 */
export function resolveB2cUnitPriceSek(input: {
  listPriceSek: number | null;
  catalogAmount: number | null;
  breakdown: {
    total: number;
    listTotalInclVat?: number | null;
    memberDiscountAmount?: number | null;
  } | null;
}): number | null {
  const catalog =
    input.catalogAmount != null &&
    Number.isFinite(input.catalogAmount) &&
    input.catalogAmount > 0
      ? input.catalogAmount
      : null;

  if (input.breakdown) {
    if (
      typeof input.breakdown.memberDiscountAmount === "number" &&
      input.breakdown.memberDiscountAmount > 0 &&
      Number.isFinite(input.breakdown.total) &&
      input.breakdown.total > 0
    ) {
      return input.breakdown.total;
    }
    if (input.listPriceSek != null && input.listPriceSek > 0) {
      return input.listPriceSek;
    }
    if (
      input.breakdown.listTotalInclVat != null &&
      Number.isFinite(input.breakdown.listTotalInclVat) &&
      input.breakdown.listTotalInclVat > 0
    ) {
      return input.breakdown.listTotalInclVat;
    }
    if (Number.isFinite(input.breakdown.total) && input.breakdown.total > 0) {
      return input.breakdown.total;
    }
  }

  if (input.listPriceSek != null && input.listPriceSek > 0) {
    return input.listPriceSek;
  }
  return catalog;
}
