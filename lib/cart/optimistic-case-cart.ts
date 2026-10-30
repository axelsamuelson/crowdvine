import type { Cart, CartItem, Product, ProductVariant } from "@/lib/shopify/types";

function emptyCart(currencyCode: string): Cart {
  return {
    id: "optimistic",
    checkoutUrl: "/checkout",
    cost: {
      subtotalAmount: { amount: "0", currencyCode },
      totalAmount: { amount: "0", currencyCode },
      totalTaxAmount: { amount: "0", currencyCode },
    },
    totalQuantity: 0,
    lines: [],
  };
}

function lineTotal(quantity: number, unitAmount: string): string {
  return (Number(unitAmount) * quantity).toString();
}

function retotal(lines: CartItem[]): Pick<Cart, "totalQuantity" | "cost"> {
  const currencyCode =
    lines[0]?.cost.totalAmount.currencyCode ??
    lines[0]?.merchandise.product.priceRange.minVariantPrice.currencyCode ??
    "SEK";
  const totalAmount = lines.reduce(
    (sum, line) => sum + Number(line.cost.totalAmount.amount),
    0,
  );
  return {
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    cost: {
      subtotalAmount: { amount: totalAmount.toString(), currencyCode },
      totalAmount: { amount: totalAmount.toString(), currencyCode },
      totalTaxAmount: { amount: "0", currencyCode },
    },
  };
}

/**
 * Client-side cart snapshot used to open the drawer immediately after
 * Reservera / add-case, before `/api/cart/add-quantity` returns.
 */
export function buildOptimisticCaseCart(
  previous: Cart | undefined,
  product: Product,
  variant: ProductVariant,
  addQuantity: number,
): Cart {
  const currencyCode =
    variant.price.currencyCode ||
    product.priceRange.minVariantPrice.currencyCode ||
    "SEK";
  const base = previous ?? emptyCart(currencyCode);
  const wineId = variant.id.replace(/-default$/, "");
  const unitAmount = variant.price.amount || product.priceRange.minVariantPrice.amount;

  const existing = base.lines.find((line) => line.merchandise.id === wineId);
  const lines: CartItem[] = existing
    ? base.lines.map((line) => {
        if (line.merchandise.id !== wineId) return line;
        const quantity = line.quantity + addQuantity;
        return {
          ...line,
          quantity,
          cost: {
            totalAmount: {
              amount: lineTotal(quantity, unitAmount),
              currencyCode,
            },
          },
        };
      })
    : [
        {
          id: `optimistic-${wineId}`,
          quantity: addQuantity,
          source: "producer",
          cost: {
            totalAmount: {
              amount: lineTotal(addQuantity, unitAmount),
              currencyCode,
            },
          },
          merchandise: {
            id: wineId,
            title: variant.title || product.title,
            selectedOptions: variant.selectedOptions ?? [],
            product,
          },
        },
        ...base.lines,
      ];

  return {
    ...base,
    id: base.id || "optimistic",
    checkoutUrl: base.checkoutUrl || "/checkout",
    ...retotal(lines),
    lines,
  };
}

/** Ask the cart modal to open immediately (paired with optimistic cart-refresh). */
export function requestCartOpen(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cart-open-request"));
}
