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

const CART_CURRENCY = "SEK";

function asSekLine(line: CartItem): CartItem {
  return {
    ...line,
    cost: {
      totalAmount: {
        amount: line.cost.totalAmount.amount,
        currencyCode: CART_CURRENCY,
      },
    },
  };
}

function retotal(lines: CartItem[]): Pick<Cart, "totalQuantity" | "cost"> {
  const currencyCode = CART_CURRENCY;
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
  const currencyCode = CART_CURRENCY;
  const base = previous ?? emptyCart(currencyCode);
  const wineId = variant.id.replace(/-default$/, "");
  const unitAmount = variant.price.amount || product.priceRange.minVariantPrice.amount;

  const existing = base.lines.find((line) => line.merchandise.id === wineId);
  const sekLines = base.lines.map(asSekLine);
  const lines: CartItem[] = existing
    ? sekLines.map((line) => {
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
        ...sekLines,
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

export const CART_ADD_ERROR_EVENT = "cart-add-error";

/** Surface a failed add inside the open cart drawer (timeout must not be silent). */
export function reportCartAddError(message: string): void {
  if (typeof window === "undefined") return;
  const text = message.trim();
  if (!text) return;
  window.dispatchEvent(
    new CustomEvent(CART_ADD_ERROR_EVENT, { detail: { message: text } }),
  );
}

export type OptimisticAddResult = {
  ok: boolean;
  cart?: Cart;
  timedOut?: boolean;
  httpStatus?: number;
};

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

/**
 * Open the cart with a local snapshot, then run add-quantity in the background.
 * `requestCartOpen` runs before `fetchAdd` is awaited.
 */
export function beginOptimisticCaseAdd(args: {
  previous: Cart | undefined;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  fetchAdd: () => Promise<Response>;
  onCart: (cart: Cart) => void;
  timeoutMessage: string;
}): Promise<OptimisticAddResult> {
  const optimistic = buildOptimisticCaseCart(
    args.previous,
    args.product,
    args.variant,
    args.quantity,
  );
  args.onCart(optimistic);
  requestCartOpen();

  return (async (): Promise<OptimisticAddResult> => {
    try {
      const response = await args.fetchAdd();
      if (!response.ok) {
        if ((args.previous?.totalQuantity ?? 0) > 0 && args.previous) {
          args.onCart(args.previous);
        }
        return {
          ok: false,
          httpStatus: response.status,
          cart: args.previous,
        };
      }
      const result = (await response.json()) as { cart?: Cart };
      const cart = result.cart ?? optimistic;
      if (result.cart) args.onCart(result.cart);
      return { ok: true, cart };
    } catch (error) {
      const timedOut = isAbortError(error);
      if (timedOut) {
        reportCartAddError(args.timeoutMessage);
        return { ok: false, timedOut: true, cart: optimistic };
      }
      if ((args.previous?.totalQuantity ?? 0) > 0 && args.previous) {
        args.onCart(args.previous);
      }
      return { ok: false, timedOut: false, cart: args.previous };
    }
  })();
}
