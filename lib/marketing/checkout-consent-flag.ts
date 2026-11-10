/**
 * Confirmation-page marketing opt-in checkbox.
 * Default OFF until Axel approves publishing the consent UI.
 * Set NEXT_PUBLIC_MARKETING_CONSENT_CHECKOUT_ENABLED=true to show.
 */
export function isMarketingConsentCheckoutEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_MARKETING_CONSENT_CHECKOUT_ENABLED === "true" ||
    process.env.MARKETING_CONSENT_CHECKOUT_ENABLED === "true"
  );
}
