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

export type ShippingPreviewDeliveryType =
  | "shared_pallet"
  | "direct_box"
  | "all";

export type ShippingPreviewFailReason =
  | "preview_error"
  | "preview_timeout"
  | "rate_missing"
  | "invalid_request"
  | "unknown";

/**
 * Dedupe key for E9: once per analytics session + reason (spec 10 / AC24).
 * Uses analytics_session_id when available; falls back to checkout session.
 */
export function shippingPreviewFailedEmitKey(reason: string): string {
  let sessionKey = getCheckoutSessionId();
  try {
    const analyticsId =
      typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("analytics_session_id")
        : null;
    if (analyticsId) sessionKey = analyticsId;
  } catch {
    // ignore
  }
  return `shipping_preview_failed:${sessionKey}:${reason}`;
}

function sanitizePreviewReason(reason: string | null | undefined): string {
  const raw = (reason ?? "unknown").trim() || "unknown";
  return /^[a-z0-9_]{1,64}$/i.test(raw) ? raw.toLowerCase() : "unknown";
}

function sanitizePreviewDeliveryType(
  deliveryType: string | null | undefined,
): ShippingPreviewDeliveryType {
  if (
    deliveryType === "shared_pallet" ||
    deliveryType === "direct_box" ||
    deliveryType === "all"
  ) {
    return deliveryType;
  }
  return "all";
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

/**
 * E9 (H13 / D15): public shipping-preview failure.
 * Once per analytics session + reason. No postal codes, addresses, or free text.
 * Do not call for AbortError / cancelled fetches.
 */
export function trackShippingPreviewFailed(input: {
  deliveryType?: ShippingPreviewDeliveryType | string | null;
  reason?: ShippingPreviewFailReason | string | null;
}): boolean {
  const safeReason = sanitizePreviewReason(input.reason);
  const deliveryType = sanitizePreviewDeliveryType(input.deliveryType);
  return emitOnce(shippingPreviewFailedEmitKey(safeReason), () => {
    void AnalyticsTracker.trackEvent({
      eventType: "shipping_preview_failed",
      eventCategory: "checkout",
      metadata: {
        delivery_type: deliveryType,
        reason: safeReason,
      },
    });
  });
}
