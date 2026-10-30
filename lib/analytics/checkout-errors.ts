/**
 * Shared checkout funnel event envelope for CRO (user_events).
 *
 * event_type: checkout_error | payment_failed | reservation_completed
 * Properties live in event_metadata (never full postcodes — postal_prefix only).
 */
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { isInternalExitFeedbackSession } from "@/lib/analytics/exit-feedback";
import { getCheckoutSessionId } from "@/lib/analytics/emit-once";
import { ensureVisitorIdentity } from "@/lib/analytics/visitor-identity";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Allowed checkout funnel steps for this envelope. */
export type CheckoutErrorStep =
  | "cart"
  | "delivery"
  | "terms"
  | "payment"
  | "confirm";

export type CheckoutFunnelEventName =
  | "checkout_error"
  | "payment_failed"
  | "reservation_completed";

export type CheckoutFunnelProperties = {
  error_code: string | null;
  message: string | null;
  wine_ids: string[];
  producer_ids: string[];
  /** First 3 digit characters of the postcode only — never the full postcode. */
  postal_prefix: string | null;
  step: CheckoutErrorStep;
  session_id: string;
  user_id: string | null;
  visitor_id: string | null;
  is_internal: boolean;
};

export function postalPrefixFromRaw(
  raw: string | null | undefined,
): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 3) return null;
  return digits.slice(0, 3);
}

export function uniqueIdList(ids: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const t = id.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function resolveCheckoutIsInternal(opts?: {
  hostname?: string;
  search?: string;
}): boolean {
  return isInternalExitFeedbackSession(opts);
}

export type BuildCheckoutFunnelPropsInput = {
  errorCode?: string | null;
  message?: string | null;
  wineIds?: Array<string | null | undefined>;
  producerIds?: Array<string | null | undefined>;
  postalRaw?: string | null;
  step: CheckoutErrorStep;
  sessionId?: string;
  userId?: string | null;
  visitorId?: string | null;
  isInternal?: boolean;
};

export function buildCheckoutFunnelProperties(
  input: BuildCheckoutFunnelPropsInput,
): CheckoutFunnelProperties {
  return {
    error_code:
      input.errorCode == null || String(input.errorCode).trim() === ""
        ? null
        : String(input.errorCode).trim(),
    message:
      input.message == null || String(input.message).trim() === ""
        ? null
        : String(input.message).trim().slice(0, 500),
    wine_ids: uniqueIdList(input.wineIds ?? []),
    producer_ids: uniqueIdList(input.producerIds ?? []),
    postal_prefix: postalPrefixFromRaw(input.postalRaw),
    step: input.step,
    session_id: (input.sessionId ?? "").trim() || "unknown",
    user_id: input.userId?.trim() || null,
    visitor_id: input.visitorId?.trim() || null,
    is_internal: Boolean(input.isInternal),
  };
}

async function resolveBrowserIdentities(): Promise<{
  userId: string | null;
  visitorId: string | null;
  sessionId: string;
  isInternal: boolean;
}> {
  const { visitorId } = ensureVisitorIdentity();
  const sessionId = getCheckoutSessionId();
  const isInternal = resolveCheckoutIsInternal();
  let userId: string | null = null;
  try {
    const sb = getSupabaseBrowserClient();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }
  return { userId, visitorId: visitorId || null, sessionId, isInternal };
}

export type TrackCheckoutFunnelInput = {
  wineIds?: Array<string | null | undefined>;
  producerIds?: Array<string | null | undefined>;
  postalRaw?: string | null;
  step: CheckoutErrorStep;
  message?: string | null;
  /** Stable machine code, e.g. no_pickup_for_cart */
  errorCode: string;
};

/**
 * Log a user-visible checkout/validation error to user_events.
 * Dedupes per (error_code, step, session) via sessionStorage.
 */
export async function trackCheckoutError(
  input: TrackCheckoutFunnelInput,
): Promise<void> {
  if (typeof window === "undefined") return;
  const ids = await resolveBrowserIdentities();
  const dedupeKey = `checkout_error:${ids.sessionId}:${input.step}:${input.errorCode}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");
  } catch {
    // continue without dedupe
  }

  const props = buildCheckoutFunnelProperties({
    errorCode: input.errorCode,
    message: input.message,
    wineIds: input.wineIds,
    producerIds: input.producerIds,
    postalRaw: input.postalRaw,
    step: input.step,
    sessionId: ids.sessionId,
    userId: ids.userId,
    visitorId: ids.visitorId,
    isInternal: ids.isInternal,
  });

  await AnalyticsTracker.trackEvent({
    eventType: "checkout_error",
    eventCategory: "checkout",
    metadata: props,
  });
}

export type TrackPaymentFailedInput = {
  wineIds?: Array<string | null | undefined>;
  producerIds?: Array<string | null | undefined>;
  postalRaw?: string | null;
  step?: CheckoutErrorStep;
  message?: string | null;
  errorCode?: string;
};

/** Exported for payment flows — same envelope; not wired in this PR. */
export async function trackPaymentFailed(
  input: TrackPaymentFailedInput,
): Promise<void> {
  if (typeof window === "undefined") return;
  const ids = await resolveBrowserIdentities();
  const props = buildCheckoutFunnelProperties({
    errorCode: input.errorCode ?? "payment_failed",
    message: input.message,
    wineIds: input.wineIds,
    producerIds: input.producerIds,
    postalRaw: input.postalRaw,
    step: input.step ?? "payment",
    sessionId: ids.sessionId,
    userId: ids.userId,
    visitorId: ids.visitorId,
    isInternal: ids.isInternal,
  });

  await AnalyticsTracker.trackEvent({
    eventType: "checkout_error",
    eventCategory: "checkout",
    metadata: {
      ...props,
      event_name: "payment_failed" satisfies CheckoutFunnelEventName,
    },
  });
}

export type TrackReservationCompletedInput = {
  wineIds?: Array<string | null | undefined>;
  producerIds?: Array<string | null | undefined>;
  postalRaw?: string | null;
  step?: CheckoutErrorStep;
  message?: string | null;
  reservationId?: string | null;
};

/** Exported for confirm flows — same envelope; not wired in this PR. */
export async function trackReservationCompleted(
  input: TrackReservationCompletedInput,
): Promise<void> {
  if (typeof window === "undefined") return;
  const ids = await resolveBrowserIdentities();
  const props = buildCheckoutFunnelProperties({
    errorCode: null,
    message: input.message ?? null,
    wineIds: input.wineIds,
    producerIds: input.producerIds,
    postalRaw: input.postalRaw,
    step: input.step ?? "confirm",
    sessionId: ids.sessionId,
    userId: ids.userId,
    visitorId: ids.visitorId,
    isInternal: ids.isInternal,
  });

  await AnalyticsTracker.trackEvent({
    eventType: "reservation_completed",
    eventCategory: "checkout",
    metadata: {
      ...props,
      event_name: "reservation_completed" satisfies CheckoutFunnelEventName,
      ...(input.reservationId
        ? { reservation_id: input.reservationId }
        : {}),
    },
  });
}
