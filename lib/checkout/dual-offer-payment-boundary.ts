/**
 * Fail-closed boundary between dual-offer quote acceptance and live payment /
 * order mutation. Quote hash / client acceptance is NOT signed authorization.
 *
 * Migration 279 (checkout_offer_quote_snapshots) is DRAFT and unapplied —
 * durable acceptance persistence is unavailable. Never invent a binding claim.
 */

import {
  mayEnableFinalCheckoutAction,
  type OfferCheckoutSessionState,
} from "@/lib/checkout/offer-acceptance";
import { isMethodAllowedForOffer } from "@/lib/checkout/offer-payment-methods";

/**
 * Flip only after 279 is applied AND a server write/read path verifies
 * ownership + version + total. Keep false in this increment.
 */
export const OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE = false as const;

export type DualOfferLivePaymentGateResult = {
  allow: boolean;
  reason: string | null;
  /** Human-facing note for review surfaces — not a product promise. */
  reviewNote: string | null;
};

/**
 * Live Stripe create/confirm / order reservation must call this before acting
 * on a dual-offer acceptance. Always fail closed while persistence is off or
 * pricing is synthetic/unverified.
 */
export function evaluateDualOfferLivePaymentGate(args: {
  state: OfferCheckoutSessionState;
  /** Attempted payment method type, if known. */
  method?: string | null;
  nowIso?: string;
  snapshotPersistenceAvailable?: boolean;
}): DualOfferLivePaymentGateResult {
  const persistence =
    args.snapshotPersistenceAvailable ?? OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE;

  const final = mayEnableFinalCheckoutAction(args.state, args.nowIso);
  if (!final.allow) {
    return {
      allow: false,
      reason: final.reason,
      reviewNote: "Final quote gate blocked acceptance.",
    };
  }

  const quote =
    args.state.dual.shared_pallet?.quote_id === args.state.acceptance?.quote_id
      ? args.state.dual.shared_pallet
      : args.state.dual.direct_box?.quote_id === args.state.acceptance?.quote_id
        ? args.state.dual.direct_box
        : null;

  if (!quote) {
    return {
      allow: false,
      reason: "accepted_quote_missing",
      reviewNote: null,
    };
  }

  if (quote.pricing_source !== "live_catalog") {
    return {
      allow: false,
      reason: "pricing_not_live_catalog",
      reviewNote:
        "Synthetic / unavailable pricing cannot create or confirm live payment.",
    };
  }

  if (quote.contract_policy === "undecided") {
    return {
      allow: false,
      reason: "contract_policy_undecided",
      reviewNote:
        "Contract / binding model is undecided — quote review ≠ purchase.",
    };
  }

  if (args.method) {
    const methodGate = isMethodAllowedForOffer({
      offer: quote.offer,
      method: args.method,
    });
    if (!methodGate.allow) {
      return {
        allow: false,
        reason: methodGate.reason,
        reviewNote: "Payment method not verified for this offer.",
      };
    }
  }

  if (!persistence) {
    return {
      allow: false,
      reason: "offer_snapshot_persistence_unavailable",
      reviewNote:
        "Migration 279 unapplied — server cannot persist/verify accepted quote_id ownership, version, and total. Quote hash alone is not authorization.",
    };
  }

  // Even with persistence, this increment does not enable dual-offer live pay.
  return {
    allow: false,
    reason: "dual_offer_live_payment_not_enabled",
    reviewNote:
      "Dual-offer live payment/order path is not enabled in this increment.",
  };
}
