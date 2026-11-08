/**
 * Explicit final-quote acceptance + stale invalidation for dual-offer checkout.
 * Choosing an offer is NOT payment consent. Acceptance binds a quote_id hash
 * for later order/payment reuse — never silent catalog recalculation.
 */

import type { FulfillmentChannel } from "@/lib/commerce/fulfillment-channel";
import {
  buildOfferQuoteId,
  canonicalOfferPayload,
  discloseOfferSwitch,
  hashOfferPayload,
  type DualOfferQuoteSet,
  type OfferAcceptanceRecord,
  type OfferQuote,
} from "@/lib/checkout/offer-quote";

export type OfferCheckoutSessionState = {
  dual: DualOfferQuoteSet;
  acceptance: OfferAcceptanceRecord | null;
  /** When true, final Pay / Reserve CTA must stay disabled. */
  uncertainty_block: boolean;
  uncertainty_reason: string | null;
  /** Stale Stripe intent ids the client must discard (ids only, never secrets). */
  invalidated_intent_ids: string[];
};

export function createOfferCheckoutSessionState(
  dual: DualOfferQuoteSet,
): OfferCheckoutSessionState {
  return {
    dual,
    acceptance: null,
    uncertainty_block: false,
    uncertainty_reason: null,
    invalidated_intent_ids: [],
  };
}

function offerFromSet(
  dual: DualOfferQuoteSet,
  offer: FulfillmentChannel,
): OfferQuote | null {
  return offer === "direct_box" ? dual.direct_box : dual.shared_pallet;
}

export function findOfferByQuoteId(
  dual: DualOfferQuoteSet,
  quoteId: string,
): OfferQuote | null {
  if (dual.shared_pallet?.quote_id === quoteId) return dual.shared_pallet;
  if (dual.direct_box?.quote_id === quoteId) return dual.direct_box;
  return null;
}

export function verifyOfferPayloadUntampered(quote: OfferQuote): boolean {
  const canonical = canonicalOfferPayload({
    offer: quote.offer,
    money: quote,
    wine_lines: quote.wine_lines,
    destination_country: quote.destination_country,
    destination_zone_id: quote.destination_zone_id,
    pricing_source: quote.pricing_source,
    debit_timing_code: quote.debit_timing.code,
    delivery_terms_code: quote.delivery_terms.code,
  });
  const digest = hashOfferPayload(canonical);
  if (digest !== quote.content_digest) return false;
  // quote_id must still match scoped acceptance identity (tenant + cart).
  const expectedId = buildOfferQuoteId({
    userId: quote.user_id,
    cartId: quote.cart_id,
    offer: quote.offer,
    contentDigest: digest,
  });
  return expectedId === quote.quote_id;
}

/** True when valid_until is set and now is at/after that instant. */
export function isOfferQuoteExpired(
  quote: OfferQuote,
  nowIso: string = new Date().toISOString(),
): boolean {
  if (!quote.valid_until) return false;
  const until = Date.parse(quote.valid_until);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(until) || !Number.isFinite(now)) return true;
  return now >= until;
}

/**
 * Atomic switch: updates selection, clears acceptance, marks uncertainty until
 * the new quote is explicitly accepted again. Preserves cart identity only
 * (caller keeps contact/address). Invalidates prior intent ids.
 */
export function switchSelectedOffer(args: {
  state: OfferCheckoutSessionState;
  toOffer: FulfillmentChannel;
  openIntentIds?: string[];
}): {
  state: OfferCheckoutSessionState;
  disclosure: ReturnType<typeof discloseOfferSwitch>;
} {
  const fromOffer = args.state.dual.selected_offer;
  const from = fromOffer ? offerFromSet(args.state.dual, fromOffer) : null;
  const to = offerFromSet(args.state.dual, args.toOffer);
  const disclosure = discloseOfferSwitch({ from, to });

  if (!disclosure.ok || !to) {
    return {
      disclosure,
      state: {
        ...args.state,
        uncertainty_block: true,
        uncertainty_reason: disclosure.reason ?? "switch_failed",
      },
    };
  }

  const dual: DualOfferQuoteSet = {
    ...args.state.dual,
    selected_offer: args.toOffer,
    selected_quote_id: to.quote_id,
  };

  return {
    disclosure,
    state: {
      dual,
      acceptance: null,
      uncertainty_block: true,
      uncertainty_reason: "awaiting_explicit_quote_acceptance",
      invalidated_intent_ids: [
        ...new Set([
          ...args.state.invalidated_intent_ids,
          ...(args.openIntentIds ?? []),
        ]),
      ],
    },
  };
}

/**
 * Explicit acceptance of the selected final quote. Fails closed on tamper,
 * unavailable offer, or selection mismatch.
 */
export function acceptSelectedOfferQuote(args: {
  state: OfferCheckoutSessionState;
  quote_id: string;
  accepted_at?: string;
}):
  | { ok: true; state: OfferCheckoutSessionState; acceptance: OfferAcceptanceRecord }
  | { ok: false; reason: string; state: OfferCheckoutSessionState } {
  const quote = findOfferByQuoteId(args.state.dual, args.quote_id);
  if (!quote) {
    return {
      ok: false,
      reason: "quote_not_in_set",
      state: {
        ...args.state,
        uncertainty_block: true,
        uncertainty_reason: "quote_not_in_set",
      },
    };
  }
  if (quote.unavailable_reason) {
    return {
      ok: false,
      reason: quote.unavailable_reason,
      state: {
        ...args.state,
        uncertainty_block: true,
        uncertainty_reason: quote.unavailable_reason,
      },
    };
  }
  if (!verifyOfferPayloadUntampered(quote)) {
    return {
      ok: false,
      reason: "quote_tampered",
      state: {
        ...args.state,
        acceptance: null,
        uncertainty_block: true,
        uncertainty_reason: "quote_tampered",
      },
    };
  }
  if (
    args.state.dual.selected_quote_id &&
    args.state.dual.selected_quote_id !== args.quote_id
  ) {
    return {
      ok: false,
      reason: "selected_quote_mismatch",
      state: {
        ...args.state,
        uncertainty_block: true,
        uncertainty_reason: "selected_quote_mismatch",
      },
    };
  }

  const canonical = canonicalOfferPayload({
    offer: quote.offer,
    money: quote,
    wine_lines: quote.wine_lines,
    destination_country: quote.destination_country,
    destination_zone_id: quote.destination_zone_id,
    pricing_source: quote.pricing_source,
    debit_timing_code: quote.debit_timing.code,
    delivery_terms_code: quote.delivery_terms.code,
  });

  const contentDigest = hashOfferPayload(canonical);
  const acceptance: OfferAcceptanceRecord = {
    quote_id: quote.quote_id,
    offer: quote.offer,
    accepted_at: args.accepted_at ?? new Date().toISOString(),
    payload_hash: contentDigest,
    content_digest: contentDigest,
    explicit_acceptance: true,
  };

  return {
    ok: true,
    acceptance,
    state: {
      ...args.state,
      dual: {
        ...args.state.dual,
        selected_quote_id: quote.quote_id,
        selected_offer: quote.offer,
      },
      acceptance,
      uncertainty_block: false,
      uncertainty_reason: null,
    },
  };
}

/** Final CTA must stay disabled while uncertain or without acceptance. */
export function mayEnableFinalCheckoutAction(
  state: OfferCheckoutSessionState,
  nowIso?: string,
): { allow: boolean; reason: string | null } {
  if (state.uncertainty_block) {
    return { allow: false, reason: state.uncertainty_reason ?? "uncertain" };
  }
  if (!state.acceptance?.explicit_acceptance) {
    return { allow: false, reason: "acceptance_required" };
  }
  const quote = findOfferByQuoteId(state.dual, state.acceptance.quote_id);
  if (!quote || quote.unavailable_reason) {
    return { allow: false, reason: "accepted_quote_unavailable" };
  }
  if (!verifyOfferPayloadUntampered(quote)) {
    return { allow: false, reason: "quote_tampered" };
  }
  // Synthetic / unverified preview money must never unlock Pay / Reserve.
  if (quote.pricing_source === "synthetic_fixture") {
    return { allow: false, reason: "synthetic_fixture_not_payable" };
  }
  if (quote.pricing_source === "unavailable") {
    return { allow: false, reason: "pricing_unavailable" };
  }
  if (quote.pricing_source !== "live_catalog") {
    return { allow: false, reason: "pricing_unverified" };
  }
  if (isOfferQuoteExpired(quote, nowIso)) {
    return { allow: false, reason: "quote_expired" };
  }
  if (quote.shipping_pending) {
    return { allow: false, reason: "shipping_pending" };
  }
  return { allow: true, reason: null };
}

/**
 * After a fresh dual compute (reload / concurrent refresh), drop acceptance if
 * the accepted quote_id is no longer present or hash diverged.
 */
export function reconcileAcceptanceAfterRecompute(args: {
  state: OfferCheckoutSessionState;
  nextDual: DualOfferQuoteSet;
}): OfferCheckoutSessionState {
  const prev = args.state.acceptance;
  if (!prev) {
    return {
      ...args.state,
      dual: args.nextDual,
      uncertainty_block: true,
      uncertainty_reason: "awaiting_explicit_quote_acceptance",
    };
  }
  const nextQuote = findOfferByQuoteId(args.nextDual, prev.quote_id);
  if (!nextQuote || !verifyOfferPayloadUntampered(nextQuote)) {
    return {
      dual: {
        ...args.nextDual,
        selected_quote_id: null,
        selected_offer: null,
      },
      acceptance: null,
      uncertainty_block: true,
      uncertainty_reason: "stale_acceptance",
      invalidated_intent_ids: args.state.invalidated_intent_ids,
    };
  }
  const canonical = canonicalOfferPayload({
    offer: nextQuote.offer,
    money: nextQuote,
    wine_lines: nextQuote.wine_lines,
    destination_country: nextQuote.destination_country,
    destination_zone_id: nextQuote.destination_zone_id,
    pricing_source: nextQuote.pricing_source,
    debit_timing_code: nextQuote.debit_timing.code,
    delivery_terms_code: nextQuote.delivery_terms.code,
  });
  if (hashOfferPayload(canonical) !== prev.payload_hash) {
    return {
      dual: {
        ...args.nextDual,
        selected_quote_id: null,
        selected_offer: null,
      },
      acceptance: null,
      uncertainty_block: true,
      uncertainty_reason: "stale_acceptance",
      invalidated_intent_ids: args.state.invalidated_intent_ids,
    };
  }
  return {
    ...args.state,
    dual: {
      ...args.nextDual,
      selected_quote_id: prev.quote_id,
      selected_offer: prev.offer,
    },
    acceptance: prev,
    uncertainty_block: false,
    uncertainty_reason: null,
  };
}
