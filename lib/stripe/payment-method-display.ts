import type Stripe from "stripe";

export type StoredPaymentMethodDetails = {
  payment_method_type: "card" | "invoice" | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
};

export function cardDetailsFromStripePaymentMethod(
  pm: Stripe.PaymentMethod,
): StoredPaymentMethodDetails {
  if (pm.type === "card" && pm.card) {
    return {
      payment_method_type: "card",
      payment_method_brand:
        typeof pm.card.brand === "string" ? pm.card.brand : null,
      payment_method_last4:
        typeof pm.card.last4 === "string" ? pm.card.last4 : null,
    };
  }

  if (pm.type === "card") {
    return {
      payment_method_type: "card",
      payment_method_brand: null,
      payment_method_last4: null,
    };
  }

  return {
    payment_method_type: null,
    payment_method_brand: null,
    payment_method_last4: null,
  };
}

export function formatPaymentMethodTypeLabel(
  type: string | null | undefined,
): string {
  switch (type) {
    case "card":
      return "Card";
    case "invoice":
      return "Invoice";
    default:
      return type ? type.replace(/_/g, " ") : "—";
  }
}

export function formatCardBrandLabel(
  brand: string | null | undefined,
): string {
  if (!brand) return "—";
  const normalized = brand.toLowerCase();
  const labels: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
    maestro: "Maestro",
  };
  return labels[normalized] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function formatPaymentMethodSummary(opts: {
  type?: string | null;
  brand?: string | null;
  last4?: string | null;
}): string | null {
  const { type, brand, last4 } = opts;

  if (type === "invoice") return "Invoice";

  if (brand || last4) {
    const parts: string[] = ["Card"];
    if (brand) parts.push(formatCardBrandLabel(brand));
    if (last4) parts.push(`•••• ${last4}`);
    return parts.join(" · ");
  }

  if (type === "card") return "Card";
  return null;
}
