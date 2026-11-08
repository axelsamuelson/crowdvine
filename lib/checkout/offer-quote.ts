/**
 * Dual-offer checkout quotes (shared_pallet vs direct_box).
 *
 * OFF-by-default foundations: versioned, server-authoritative offer quotes,
 * atomic switch / stale invalidation, and fail-closed acceptance gates.
 * Absolute margins and final legal/debit policy are NOT decided here.
 *
 * Live production checkout stays on the existing single-channel quote path
 * until CHECKOUT_DUAL_OFFER_COMPARE (and separately DIRECT_BOX_CHECKOUT_ENABLED)
 * are explicitly enabled. Synthetic fixture pricing is labeled and never
 * treated as production business settings.
 */

import { createHash } from "crypto";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";
import type { FulfillmentChannel } from "@/lib/commerce/fulfillment-channel";

export const OFFER_QUOTE_SCHEMA_VERSION = 1 as const;

/** How bottle/shipping money was obtained for this offer quote. */
export type OfferPricingSource =
  | "live_catalog"
  | "synthetic_fixture"
  | "unavailable";

/**
 * Binding / debit contract is NOT finally selected by product.
 * Keep the field optional and never treat a value as approved policy.
 */
export type OfferContractPolicyPlaceholder =
  | "undecided"
  | "conditional_binding_later_debit"
  | "nonbinding_inquiry_then_purchase";

export type OfferDeliveryTerms = {
  /** Opaque code — never invent calendar SLAs in copy from this alone. */
  code: "shared_pallet_collective_fill" | "direct_box_independent" | "unknown";
  /** Human label for preview only; not legal copy. */
  previewLabelSv: string;
  previewLabelEn: string;
};

export type OfferDebitTiming = {
  code:
    | "no_immediate_debit"
    | "immediate_on_confirm_proposed"
    | "unknown";
  previewLabelSv: string;
  previewLabelEn: string;
};

export type OfferLineSnapshot = {
  wine_id: string;
  quantity: number;
  /** Unit price in major units of quote currency (SEK today). */
  unit_price_sek: number;
  line_total_sek: number;
};

/**
 * One server-authoritative offer quote. Extends today's CheckoutQuote money
 * fields and adds versioning + disclosure terms. Immutable once accepted.
 */
export type OfferQuote = CheckoutQuote & {
  schema_version: typeof OFFER_QUOTE_SCHEMA_VERSION;
  /** Stable id for this computed quote (hash of canonical payload). */
  quote_id: string;
  offer: FulfillmentChannel;
  pricing_source: OfferPricingSource;
  currency: "SEK";
  /** ISO country of destination used for shipping resolution. */
  destination_country: string | null;
  /** Opaque destination zone id when known. */
  destination_zone_id: string | null;
  computed_at: string;
  /** Exclusive validity end (ISO). Null = not granted / unknown. */
  valid_until: string | null;
  wine_lines: OfferLineSnapshot[];
  bottle_count: number;
  /** Bottle unit price disclosure (cart-weighted average when mixed). */
  bottle_unit_price_sek: number;
  wines_subtotal_sek: number;
  delivery_terms: OfferDeliveryTerms;
  debit_timing: OfferDebitTiming;
  /** Placeholder only — must stay undecided until legal policy is approved. */
  contract_policy: OfferContractPolicyPlaceholder;
  /** Why this offer cannot be selected (fail closed). */
  unavailable_reason: string | null;
};

export type DualOfferQuoteSet = {
  schema_version: typeof OFFER_QUOTE_SCHEMA_VERSION;
  cart_id: string;
  destination_country: string | null;
  computed_at: string;
  shared_pallet: OfferQuote | null;
  direct_box: OfferQuote | null;
  /**
   * Currently selected offer quote_id, or null when none accepted / stale.
   * Selection alone is NOT payment consent.
   */
  selected_quote_id: string | null;
  selected_offer: FulfillmentChannel | null;
};

export type OfferAcceptanceRecord = {
  quote_id: string;
  offer: FulfillmentChannel;
  accepted_at: string;
  /** SHA-256 of canonical offer payload at acceptance (tamper detection). */
  payload_hash: string;
  /** Explicit customer acceptance of THIS quote — not payment confirmation. */
  explicit_acceptance: true;
};

/** Synthetic SE preview fixture — labeled, not a production rate card. */
export const SYNTHETIC_DIRECT_BOX_FIXTURE = {
  pricing_source: "synthetic_fixture" as const,
  label: "SYNTHETIC_PREVIEW_ONLY",
  /** Relative uplift vs shared bottle subtotal for preview compare only. */
  bottle_price_multiplier: 1.12,
  shipping_sek: 149,
  destination_country: "SE",
};

export function isDualOfferCompareEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    String(env.CHECKOUT_DUAL_OFFER_COMPARE ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

export function sharedPalletDeliveryTerms(): OfferDeliveryTerms {
  return {
    code: "shared_pallet_collective_fill",
    previewLabelSv: "Delad pall — längre väntan, kollektiv fyllnad",
    previewLabelEn: "Shared pallet — longer wait, collective fill",
  };
}

export function directBoxDeliveryTerms(): OfferDeliveryTerms {
  return {
    code: "direct_box_independent",
    previewLabelSv: "Direkt — kortare leverans (föreslagen förmåga)",
    previewLabelEn: "Direct — shorter delivery (proposed capability)",
  };
}

export function sharedPalletDebitTiming(): OfferDebitTiming {
  return {
    code: "no_immediate_debit",
    previewLabelSv: "Ingen omedelbar debitering",
    previewLabelEn: "No immediate debit",
  };
}

export function directBoxDebitTiming(): OfferDebitTiming {
  return {
    code: "immediate_on_confirm_proposed",
    previewLabelSv: "Omedelbar betalning vid bekräftelse (föreslaget)",
    previewLabelEn: "Immediate payment on confirm (proposed)",
  };
}

/** Canonical JSON for hashing — stable key order via sorted stringify. */
export function canonicalOfferPayload(parts: {
  offer: FulfillmentChannel;
  money: CheckoutQuote;
  wine_lines: OfferLineSnapshot[];
  destination_country: string | null;
  destination_zone_id: string | null;
  pricing_source: OfferPricingSource;
  debit_timing_code: OfferDebitTiming["code"];
  delivery_terms_code: OfferDeliveryTerms["code"];
}): string {
  const sortedLines = [...parts.wine_lines].sort((a, b) =>
    a.wine_id.localeCompare(b.wine_id),
  );
  return JSON.stringify({
    schema_version: OFFER_QUOTE_SCHEMA_VERSION,
    offer: parts.offer,
    destination_country: parts.destination_country,
    destination_zone_id: parts.destination_zone_id,
    pricing_source: parts.pricing_source,
    debit_timing_code: parts.debit_timing_code,
    delivery_terms_code: parts.delivery_terms_code,
    subtotal_sek: parts.money.subtotal_sek,
    shipping_sek: parts.money.shipping_sek,
    promo_discount_sek: parts.money.promo_discount_sek,
    voucher_discount_sek: parts.money.voucher_discount_sek,
    pact_points_sek: parts.money.pact_points_sek,
    total_sek: parts.money.total_sek,
    total_ore: parts.money.total_ore,
    shipping_pending: parts.money.shipping_pending,
    wine_lines: sortedLines,
  });
}

export function hashOfferPayload(canonicalJson: string): string {
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

export function buildOfferQuoteId(payloadHash: string): string {
  return `oq_${payloadHash.slice(0, 32)}`;
}

export function buildOfferQuote(args: {
  offer: FulfillmentChannel;
  money: CheckoutQuote;
  wine_lines: OfferLineSnapshot[];
  destination_country: string | null;
  destination_zone_id?: string | null;
  pricing_source: OfferPricingSource;
  computed_at?: string;
  valid_until?: string | null;
  unavailable_reason?: string | null;
}): OfferQuote {
  const bottle_count = args.wine_lines.reduce(
    (s, l) => s + Math.max(0, Math.floor(l.quantity)),
    0,
  );
  const wines_subtotal_sek = args.wine_lines.reduce(
    (s, l) => s + l.line_total_sek,
    0,
  );
  const bottle_unit_price_sek =
    bottle_count > 0
      ? Math.round((wines_subtotal_sek / bottle_count) * 100) / 100
      : 0;

  const delivery_terms =
    args.offer === "direct_box"
      ? directBoxDeliveryTerms()
      : sharedPalletDeliveryTerms();
  const debit_timing =
    args.offer === "direct_box"
      ? directBoxDebitTiming()
      : sharedPalletDebitTiming();

  const canonical = canonicalOfferPayload({
    offer: args.offer,
    money: args.money,
    wine_lines: args.wine_lines,
    destination_country: args.destination_country,
    destination_zone_id: args.destination_zone_id ?? null,
    pricing_source: args.pricing_source,
    debit_timing_code: debit_timing.code,
    delivery_terms_code: delivery_terms.code,
  });
  const payload_hash = hashOfferPayload(canonical);
  const quote_id = buildOfferQuoteId(payload_hash);
  const computed_at = args.computed_at ?? new Date().toISOString();

  return {
    ...args.money,
    fulfillment_channel: args.offer,
    schema_version: OFFER_QUOTE_SCHEMA_VERSION,
    quote_id,
    offer: args.offer,
    pricing_source: args.pricing_source,
    currency: "SEK",
    destination_country: args.destination_country,
    destination_zone_id: args.destination_zone_id ?? null,
    computed_at,
    valid_until: args.valid_until ?? null,
    wine_lines: args.wine_lines,
    bottle_count,
    bottle_unit_price_sek,
    wines_subtotal_sek,
    delivery_terms,
    debit_timing,
    contract_policy: "undecided",
    unavailable_reason: args.unavailable_reason ?? null,
  };
}

/** Unavailable offer slot — fail closed, never invent money. */
export function buildUnavailableOfferQuote(args: {
  offer: FulfillmentChannel;
  reason: string;
  destination_country?: string | null;
  computed_at?: string;
}): OfferQuote {
  const emptyMoney: CheckoutQuote = {
    subtotal_sek: 0,
    shipping_sek: 0,
    promo_discount_sek: 0,
    voucher_discount_sek: 0,
    pact_points_sek: 0,
    pact_points_redeem: 0,
    total_sek: 0,
    total_ore: 0,
    shipping_pending: true,
    fulfillment_channel: args.offer,
    rate_channel: null,
  };
  return buildOfferQuote({
    offer: args.offer,
    money: emptyMoney,
    wine_lines: [],
    destination_country: args.destination_country ?? null,
    pricing_source: "unavailable",
    computed_at: args.computed_at,
    valid_until: null,
    unavailable_reason: args.reason,
  });
}

/**
 * Preview-only direct offer from synthetic fixture uplift.
 * Must stay labeled synthetic_fixture — never write these as live rates.
 */
export function buildSyntheticDirectOfferFromShared(args: {
  shared: OfferQuote;
  fixture?: typeof SYNTHETIC_DIRECT_BOX_FIXTURE;
}): OfferQuote {
  const fixture = args.fixture ?? SYNTHETIC_DIRECT_BOX_FIXTURE;
  if (args.shared.unavailable_reason || args.shared.bottle_count <= 0) {
    return buildUnavailableOfferQuote({
      offer: "direct_box",
      reason: "shared_offer_unavailable",
      destination_country: args.shared.destination_country,
    });
  }
  const wine_lines: OfferLineSnapshot[] = args.shared.wine_lines.map((l) => {
    const unit =
      Math.round(l.unit_price_sek * fixture.bottle_price_multiplier * 100) /
      100;
    return {
      wine_id: l.wine_id,
      quantity: l.quantity,
      unit_price_sek: unit,
      line_total_sek: Math.round(unit * l.quantity * 100) / 100,
    };
  });
  const wines_subtotal = wine_lines.reduce((s, l) => s + l.line_total_sek, 0);
  const shipping = fixture.shipping_sek;
  const total =
    Math.round(
      (wines_subtotal +
        shipping -
        args.shared.promo_discount_sek -
        args.shared.voucher_discount_sek -
        args.shared.pact_points_sek) *
        100,
    ) / 100;
  const money: CheckoutQuote = {
    subtotal_sek: wines_subtotal,
    shipping_sek: shipping,
    promo_discount_sek: args.shared.promo_discount_sek,
    voucher_discount_sek: args.shared.voucher_discount_sek,
    pact_points_sek: args.shared.pact_points_sek,
    pact_points_redeem: args.shared.pact_points_redeem,
    total_sek: total,
    total_ore: Math.round(total * 100),
    shipping_pending: false,
    fulfillment_channel: "direct_box",
    rate_channel: "direct_box",
  };
  return buildOfferQuote({
    offer: "direct_box",
    money,
    wine_lines,
    destination_country:
      args.shared.destination_country ?? fixture.destination_country,
    destination_zone_id: args.shared.destination_zone_id,
    pricing_source: "synthetic_fixture",
    computed_at: args.shared.computed_at,
    valid_until: args.shared.valid_until,
    unavailable_reason: null,
  });
}

export function buildDualOfferQuoteSet(args: {
  cart_id: string;
  shared_pallet: OfferQuote | null;
  direct_box: OfferQuote | null;
  selected_quote_id?: string | null;
  destination_country?: string | null;
  computed_at?: string;
}): DualOfferQuoteSet {
  const computed_at = args.computed_at ?? new Date().toISOString();
  let selected_quote_id = args.selected_quote_id ?? null;
  let selected_offer: FulfillmentChannel | null = null;
  if (selected_quote_id) {
    if (args.shared_pallet?.quote_id === selected_quote_id) {
      selected_offer = "shared_pallet";
    } else if (args.direct_box?.quote_id === selected_quote_id) {
      selected_offer = "direct_box";
    } else {
      selected_quote_id = null;
    }
  }
  return {
    schema_version: OFFER_QUOTE_SCHEMA_VERSION,
    cart_id: args.cart_id,
    destination_country:
      args.destination_country ??
      args.shared_pallet?.destination_country ??
      args.direct_box?.destination_country ??
      null,
    computed_at,
    shared_pallet: args.shared_pallet,
    direct_box: args.direct_box,
    selected_quote_id,
    selected_offer,
  };
}

/** Disclose bottle-price and total deltas when switching offers. */
export function discloseOfferSwitch(args: {
  from: OfferQuote | null;
  to: OfferQuote | null;
}): {
  ok: boolean;
  reason: string | null;
  bottle_unit_price_from: number | null;
  bottle_unit_price_to: number | null;
  total_from_sek: number | null;
  total_to_sek: number | null;
} {
  if (!args.to || args.to.unavailable_reason) {
    return {
      ok: false,
      reason: args.to?.unavailable_reason ?? "target_offer_missing",
      bottle_unit_price_from: args.from?.bottle_unit_price_sek ?? null,
      bottle_unit_price_to: null,
      total_from_sek: args.from?.total_sek ?? null,
      total_to_sek: null,
    };
  }
  return {
    ok: true,
    reason: null,
    bottle_unit_price_from: args.from?.bottle_unit_price_sek ?? null,
    bottle_unit_price_to: args.to.bottle_unit_price_sek,
    total_from_sek: args.from?.total_sek ?? null,
    total_to_sek: args.to.total_sek,
  };
}
