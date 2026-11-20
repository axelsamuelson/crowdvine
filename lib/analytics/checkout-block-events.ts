/**
 * Privacy-safe checkout block / shipping-failure signals for user_events.
 * No names, emails, phones, streets, or free-text addresses.
 */

import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { emitOnce, getCheckoutSessionId } from "@/lib/analytics/emit-once";

/** Must match analytics_checkout_step() — never "continue" (maps to NULL). */
export type CheckoutBlockedStep =
  | "postal"
  | "delivery"
  | "age_terms"
  | "payment";

/** Short machine codes only — never free-text user input. */
export type CheckoutBlockReason =
  | "missing_phone"
  | "missing_email"
  | "invalid_email"
  | "missing_name"
  | "address_not_persisted"
  | "delivery_not_selected"
  | "quote_missing"
  | "quote_loading"
  | "quote_stale"
  | "quote_timeout"
  | "quote_error"
  | "auth_required"
  | "quote_channel_mismatch"
  | "direct_box_shipping_pending"
  | "direct_box_shipping_unquoted"
  | "direct_box_pact_rate_forbidden"
  | "direct_box_carrier_unconfigured"
  | "pallet_required"
  | "zone_required"
  | "purchase_disabled";

export type ShippingQuoteDeliveryType = "shared_pallet" | "direct_box";

export function checkoutStepBlockedEmitKey(
  step: string,
  reason: string,
): string {
  return `checkout_step_blocked:${getCheckoutSessionId()}:${step}:${reason}`;
}

export function shippingQuoteFailedEmitKey(
  deliveryType: string,
  reason: string,
): string {
  return `shipping_quote_failed:${getCheckoutSessionId()}:${deliveryType}:${reason}`;
}

/**
 * Emit once per checkout session + step + reason when the shopper actually
 * tries to advance (Fortsätt / locked step / blocked CTA) — not on field status.
 */
export function trackCheckoutStepBlocked(input: {
  step: CheckoutBlockedStep;
  reason: CheckoutBlockReason;
}): boolean {
  return emitOnce(checkoutStepBlockedEmitKey(input.step, input.reason), () => {
    void AnalyticsTracker.trackEvent({
      eventType: "checkout_step_blocked",
      eventCategory: "checkout",
      metadata: {
        step: input.step,
        reason: input.reason,
      },
    });
  });
}

/**
 * Emit once per session + delivery_type + reason when shipping cannot be priced.
 */
export function trackShippingQuoteFailed(input: {
  deliveryType: ShippingQuoteDeliveryType;
  reason?: string | null;
}): boolean {
  const reason = (input.reason ?? "unknown").trim() || "unknown";
  // Keep reason short / coded — drop anything that looks like free text.
  const safeReason = /^[a-z0-9_]{1,64}$/i.test(reason) ? reason : "unknown";
  return emitOnce(
    shippingQuoteFailedEmitKey(input.deliveryType, safeReason),
    () => {
      void AnalyticsTracker.trackEvent({
        eventType: "shipping_quote_failed",
        eventCategory: "checkout",
        metadata: {
          delivery_type: input.deliveryType,
          reason: safeReason,
        },
      });
    },
  );
}
