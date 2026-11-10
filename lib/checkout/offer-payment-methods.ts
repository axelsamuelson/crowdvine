/**
 * Per-offer payment method capability allowlist.
 * Default DENY for anything not explicitly verified for that offer.
 *
 * Shared pallet phase 1: card only (SetupIntent → charge at pallet close).
 * Klarna / BLIK / Swish / etc. denied for pallet. Direct (still OFF) keeps
 * candidates for when the flag is enabled — immediate charge.
 */

import type { FulfillmentChannel } from "@/lib/commerce/fulfillment-channel";

export type PaymentMethodCapability = {
  /** Stripe-ish type id e.g. card, klarna, swish */
  method: string;
  /**
   * verified = tested for this offer's debit model;
   * candidate = may appear in Elements but must NOT be asserted compatible;
   * denied = fail closed.
   */
  status: "verified" | "candidate" | "denied";
  /** Whether off_session reuse was verified for THIS offer (unknown ≠ false claim). */
  off_session: "verified_yes" | "verified_no" | "unknown";
};

/** Shared pallet phase 1 — card only (saved SI, charged at close). */
const SHARED_PALLET_METHODS: PaymentMethodCapability[] = [
  {
    method: "card",
    status: "verified",
    off_session: "verified_yes",
  },
  { method: "link", status: "denied", off_session: "unknown" },
  { method: "klarna", status: "denied", off_session: "verified_no" },
  { method: "amazon_pay", status: "denied", off_session: "unknown" },
  { method: "blik", status: "denied", off_session: "verified_no" },
  { method: "bancontact", status: "denied", off_session: "unknown" },
  { method: "swish", status: "denied", off_session: "verified_no" },
];

/** Direct box — immediate charge when enabled; still candidates until live. */
const DIRECT_BOX_METHODS: PaymentMethodCapability[] = [
  { method: "card", status: "candidate", off_session: "verified_no" },
  { method: "link", status: "candidate", off_session: "unknown" },
  { method: "klarna", status: "candidate", off_session: "unknown" },
  { method: "amazon_pay", status: "candidate", off_session: "unknown" },
  { method: "swish", status: "candidate", off_session: "unknown" },
];

export function methodsForOffer(
  offer: FulfillmentChannel,
): PaymentMethodCapability[] {
  return offer === "direct_box" ? DIRECT_BOX_METHODS : SHARED_PALLET_METHODS;
}

export function isMethodAllowedForOffer(args: {
  offer: FulfillmentChannel;
  method: string;
}): { allow: boolean; reason: string | null; capability: PaymentMethodCapability | null } {
  const method = String(args.method || "")
    .trim()
    .toLowerCase();
  if (!method) {
    return { allow: false, reason: "method_missing", capability: null };
  }
  const capability =
    methodsForOffer(args.offer).find((m) => m.method === method) ?? null;
  if (!capability) {
    return { allow: false, reason: "method_not_in_allowlist", capability: null };
  }
  if (capability.status === "denied") {
    return { allow: false, reason: "method_denied", capability };
  }
  if (capability.status !== "verified") {
    // Candidates must not pass final consent until verified.
    return { allow: false, reason: "method_unverified", capability };
  }
  return { allow: true, reason: null, capability };
}

/**
 * Filter Stripe Payment Element types for display hints only.
 * Unverified candidates may still be shown in preview UI but final action
 * stays blocked via isMethodAllowedForOffer.
 */
export function previewVisibleMethods(offer: FulfillmentChannel): string[] {
  return methodsForOffer(offer)
    .filter((m) => m.status === "verified" || m.status === "candidate")
    .map((m) => m.method);
}
