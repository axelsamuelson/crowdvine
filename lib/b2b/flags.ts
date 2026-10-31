/**
 * Producer orders on dirtywine.se are paused for now.
 * This flag controls both the B2B UI and the cart API.
 */
export const B2B_PRODUCER_ORDERS_ENABLED = false;

export type DirtywineCheckoutMode = "inquiry" | "checkout";

/**
 * Dirtywine checkout mode.
 * - inquiry: cart CTA → order inquiry form (no payment)
 * - checkout: existing B2B checkout path (kept intact; production default until Axel enables inquiry)
 *
 * Prefer NEXT_PUBLIC_ so client components (cart CTA) see the same value.
 * Server may also set DIRTYWINE_CHECKOUT_MODE. Default is checkout — do not
 * flip production without an explicit env change by the owner.
 */
export function getDirtywineCheckoutMode(): DirtywineCheckoutMode {
  const raw = (
    process.env.NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE ||
    process.env.DIRTYWINE_CHECKOUT_MODE ||
    "checkout"
  )
    .trim()
    .toLowerCase();
  return raw === "inquiry" ? "inquiry" : "checkout";
}

export function isDirtywineInquiryMode(): boolean {
  return getDirtywineCheckoutMode() === "inquiry";
}

/** Internal notify recipient; Hugo/Axel may override via env. */
export function getB2bInquiryNotifyEmail(): string {
  const fromEnv = process.env.B2B_INQUIRY_NOTIFY_EMAIL?.trim();
  return fromEnv || "axel@dirtywine.se";
}
