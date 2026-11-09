/**
 * Shared-pallet SetupIntent / Payment Element — Stripe Link policy (phase 1).
 *
 * CRO 2026-11-09: Link OFF by default. Prefer card-only PE so Klarna / Amazon Pay
 * / Link signup do not appear. If Stripe later supports “existing Link only”
 * without the signup block, flip this constant (and PE wallets.link) after CRO.
 */
export const SHARED_PALLET_STRIPE_LINK_ENABLED = false;

/** Analytics + PE wiring — always mirrors the constant. */
export function sharedPalletLinkEnabled(): boolean {
  return SHARED_PALLET_STRIPE_LINK_ENABLED === true;
}

/**
 * Payment Element `options` extras for shared-pallet card step.
 * Always card-first; Link wallet only when the constant is true.
 */
export function sharedPalletPaymentElementOptions(args?: {
  linkEnabled?: boolean;
}): {
  paymentMethodOrder: ["card"];
  wallets: {
    applePay: "never";
    googlePay: "never";
    link: "auto" | "never";
  };
} {
  const linkOn = args?.linkEnabled ?? sharedPalletLinkEnabled();
  return {
    paymentMethodOrder: ["card"],
    wallets: {
      applePay: "never",
      googlePay: "never",
      link: linkOn ? "auto" : "never",
    },
  };
}
