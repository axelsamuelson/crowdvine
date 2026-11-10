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
 * Country is never collected in-PE — passed on confirm from delivery address.
 */
export function sharedPalletPaymentElementOptions(args?: {
  linkEnabled?: boolean;
  businessName?: string;
}): {
  paymentMethodOrder: ["card"];
  layout: {
    type: "accordion";
    defaultCollapsed: false;
    radios: false;
    spacedAccordionItems: false;
  };
  business: { name: string };
  fields: {
    billingDetails: {
      address: { country: "never" };
    };
  };
  wallets: {
    applePay: "never";
    googlePay: "never";
    link: "auto" | "never";
  };
} {
  const linkOn = args?.linkEnabled ?? sharedPalletLinkEnabled();
  const businessName =
    typeof args?.businessName === "string" && args.businessName.trim()
      ? args.businessName.trim()
      : "EURPACT OÜ";
  return {
    paymentMethodOrder: ["card"],
    // Accordion + radios:false avoids a lone "Kort"/"Card" method tab.
    layout: {
      type: "accordion",
      defaultCollapsed: false,
      radios: false,
      spacedAccordionItems: false,
    },
    business: { name: businessName },
    fields: {
      billingDetails: {
        address: { country: "never" },
      },
    },
    wallets: {
      applePay: "never",
      googlePay: "never",
      link: linkOn ? "auto" : "never",
    },
  };
}
