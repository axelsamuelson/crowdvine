/**
 * Customer-facing dual-offer copy helpers (Swedish/English via site i18n keys).
 * Machine gate codes stay internal — never render raw codes on checkout.
 */

import { translate } from "@/lib/i18n/messages";
import type { OfferQuote } from "@/lib/checkout/offer-quote";

export type DualOfferUiLocale = "sv" | "en";

/**
 * B2C catalog unit prices are VAT-inclusive (see lib/pricing/formula.ts:
 * priceExVat × (1+vat) for channel b2c). Dual-offer totals reuse those
 * wine line totals + shipping; until legal/product decides a separate VAT
 * disclosure line, show totals as inkl. moms only — never invent a VAT figure.
 */
export function offerTotalsIncludeVat(): boolean {
  return true;
}

/** Always label bottle unit as cart-weighted average (öre-rounded). */
export function offerBottleAverageLabelKey(): "dualOfferBottleAvg" {
  return "dualOfferBottleAvg";
}

export function dualOfferMsg(
  locale: DualOfferUiLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  return translate(locale, `checkout.${key}`, params);
}

/** Map fail-closed gate / uncertainty codes to human Swedish/English. */
export function humanizeDualOfferBlockReason(
  reason: string | null | undefined,
  locale: DualOfferUiLocale,
): string {
  const code = String(reason ?? "").trim();
  const known: Record<string, string> = {
    awaiting_explicit_quote_acceptance: "dualOfferBlockAwaitingSelection",
    acceptance_required: "dualOfferBlockAwaitingSelection",
    contract_policy_undecided: "dualOfferBlockUnavailable",
    offer_snapshot_persistence_unavailable: "dualOfferBlockUnavailable",
    dual_offer_live_payment_not_enabled: "dualOfferBlockUnavailable",
    synthetic_fixture_not_payable: "dualOfferBlockUnavailable",
    pricing_not_live_catalog: "dualOfferBlockUnavailable",
    pricing_unavailable: "dualOfferBlockUnavailable",
    pricing_unverified: "dualOfferBlockUnavailable",
    quote_expired: "dualOfferBlockExpired",
    quote_tampered: "dualOfferBlockMismatch",
    selected_quote_mismatch: "dualOfferBlockMismatch",
    quote_not_in_set: "dualOfferBlockMismatch",
    stale_acceptance: "dualOfferBlockMismatch",
    accepted_quote_unavailable: "dualOfferBlockMismatch",
    accepted_quote_missing: "dualOfferBlockMismatch",
    shipping_pending: "dualOfferBlockShipping",
    no_state: "dualOfferBlockLoading",
    uncertain: "dualOfferBlockAwaitingSelection",
  };
  const key = known[code] ?? "dualOfferBlockUnavailable";
  return dualOfferMsg(locale, key);
}

export function selectedOfferConfirmHint(
  quote: OfferQuote | null,
  locale: DualOfferUiLocale,
): string {
  if (!quote) return dualOfferMsg(locale, "dualOfferConfirmHintNone");
  if (quote.offer === "direct_box") {
    return dualOfferMsg(locale, "dualOfferConfirmHintDirect");
  }
  return dualOfferMsg(locale, "dualOfferConfirmHintShared");
}

/** English API strings that must never toast raw to customers. */
export const ZONE_CONFIG_CUSTOMER_ERROR_MARKERS = [
  "Wine zone must include a city",
  "Wine zone must include a city (stad).",
] as const;

export function customerZoneSaveErrorMessage(
  raw: string | null | undefined,
  locale: DualOfferUiLocale,
): string {
  const msg = String(raw ?? "").trim();
  if (!msg) return dualOfferMsg(locale, "saveFailed");
  const lower = msg.toLowerCase();
  if (
    ZONE_CONFIG_CUSTOMER_ERROR_MARKERS.some((m) =>
      lower.includes(m.toLowerCase()),
    ) ||
    lower.includes("wine zone is misconfigured") ||
    lower.includes("geo_zone_misconfigured")
  ) {
    return dualOfferMsg(locale, "zoneConfigCustomerMessage");
  }
  return msg;
}
