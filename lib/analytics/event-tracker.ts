import { emitOnce } from "@/lib/analytics/emit-once";
import { isInternalDevice } from "@/lib/analytics/internal-device";
import {
  ensureVisitorIdentity,
  readFirstTouchForMetadata,
  readGeoCountryCode,
} from "@/lib/analytics/visitor-identity";
import { isAuthNetworkError } from "@/lib/auth/session-errors";

/** First-party analytics ingest (replaces direct Supabase REST from the browser). */
export const FIRST_PARTY_ANALYTICS_PATH = "/api/e";

/**
 * Legacy unused path: browser → Supabase REST `user_events`.
 * Kept removable for rollback; the live tracker posts to {@link FIRST_PARTY_ANALYTICS_PATH}.
 */
export function legacySupabaseUserEventsRestUrl(
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
): string {
  return `${supabaseUrl.replace(/\/$/, "")}/rest/v1/user_events`;
}

/** Where a Reserve / add-to-cart CTA was clicked. */
export type CartEventSource = "list" | "product" | "guide" | "b2b" | "pdp_case";

/** Machine reason codes for add_to_cart_failed — never free-text / PII. */
export type AddToCartFailReason =
  | "http_error"
  | "network_error"
  | "empty_cart"
  | "unknown";

export type EventType =
  // Access & Auth
  | "access_request_submitted"
  | "access_approved"
  | "access_denied"
  | "user_first_login"
  | "user_login"
  | "user_logout"
  | "auth_email_step_shown"
  | "auth_email_step_completed"
  | "auth_email_step_abandoned"
  | "auth_email_link_sent"
  // Invitations
  | "invitation_link_opened"
  | "invitation_signup_started"
  | "invitation_signup_completed"
  | "invitation_code_invalid"
  | "invitation_code_expired"
  | "invitation_generated"
  | "invitation_shared"
  // Navigation
  | "page_view"
  | "producer_viewed"
  | "product_list_viewed"
  | "product_viewed"
  | "price_viewed"
  | "pallet_status_viewed"
  | "filter_used"
  | "producer_boxes_cta_clicked"
  | "collection_viewed"
  | "invite_shop_viewed"
  // Search
  | "search_submitted"
  | "search_result_clicked"
  | "guide_filter"
  // Cart & Validation
  | "add_to_cart"
  | "add_to_cart_failed"
  | "remove_from_cart"
  | "cart_opened"
  | "cart_validation_shown"
  | "cart_validation_passed"
  | "cart_validation_failed"
  | "sticky_atc_shown"
  | "sticky_atc_clicked"
  | "six_pack_rule_viewed"
  | "pdp_section_opened"
  | "why_modal_opened"
  // Welcome modal (post-login)
  | "welcome_shown"
  | "welcome_step_viewed"
  | "welcome_dismissed"
  | "welcome_cta_clicked"
  // Checkout
  | "checkout_started"
  | "checkout_completed"
  | "reservation_completed"
  | "checkout_abandoned"
  | "checkout_step_viewed"
  | "checkout_step_completed"
  | "checkout_error"
  | "payment_failed"
  | "delivery_ineligible"
  | "checkout_postal_started"
  | "checkout_delivery_captured"
  | "checkout_zone_error"
  | "checkout_stripe_confirm_failed"
  | "checkout_confirm_failed"
  | "checkout_login_wall_shown"
  | "checkout_membership_wall_shown"
  | "age_confirmation_shown"
  | "age_confirmed"
  | "age_confirmation_failed"
  | "terms_accepted"
  // Producer decisions
  | "producer_reservation_approved"
  | "producer_reservation_rejected"
  // Engagement
  | "scroll_depth"
  | "session_engaged"
  | "time_on_page"
  | "modal_opened"
  | "modal_closed"
  | "video_played"
  | "image_zoomed"
  | "tasting_flow_opened"
  // Account
  | "profile_updated"
  | "membership_tier_viewed"
  | "notification_settings_changed"
  // B2B (Dirty Wine) — funnel catalog from #113; inquiry mode wires started/submitted
  | "b2b_contact_clicked"
  | "b2b_inquiry_started"
  | "b2b_inquiry_submitted"
  | "b2b_tasting_requested"
  | "b2b_quote_sent"
  | "b2b_order_created";

export type EventCategory =
  | "auth"
  | "invitation"
  | "navigation"
  | "search"
  | "cart"
  | "checkout"
  | "validation"
  | "engagement"
  | "account"
  | "b2b";

interface TrackEventParams {
  eventType: EventType;
  eventCategory: EventCategory;
  metadata?: Record<string, any>;
  pageUrl?: string;
  referrer?: string;
  /**
   * Use sendBeacon / fetch keepalive so the insert survives page unload
   * (visibility hidden / pagehide / unmount).
   */
  keepalive?: boolean;
}

export class AnalyticsTracker {
  private static getSessionId(): string {
    if (typeof window === "undefined") return "";

    let sessionId = sessionStorage.getItem("analytics_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("analytics_session_id", sessionId);
    }
    return sessionId;
  }

  private static isBotClient(): boolean {
    if (typeof navigator === "undefined") return false;
    if (navigator.webdriver) return true;
    const ua = navigator.userAgent || "";
    return /bot|crawl|spider|headless|lighthouse|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|outbrain|pinterest|vkshare|preview/i.test(
      ua,
    );
  }

  static async trackEvent({
    eventType,
    eventCategory,
    metadata = {},
    pageUrl,
    referrer,
    keepalive = false,
  }: TrackEventParams): Promise<void> {
    if (typeof window === "undefined") return;

    const rawReferrer = referrer || document.referrer || "";
    const safeReferrer =
      /localhost|127\.0\.0\.1/i.test(rawReferrer) ? "" : rawReferrer;

    const { visitorId, firstTouch, isReturningVisitor, isNewVisitor } =
      ensureVisitorIdentity();
    const countryCode = readGeoCountryCode();
    const likelyBot = this.isBotClient();

    let eventMetadata: Record<string, unknown> = { ...metadata };

    // First-touch attribution + new/returning on every event.
    const touch = firstTouch ?? readFirstTouchForMetadata();
    if (touch) {
      eventMetadata = { ...eventMetadata, first_touch: touch };
    }
    eventMetadata = {
      ...eventMetadata,
      is_returning_visitor: isReturningVisitor,
      is_new_visitor: isNewVisitor,
      visitor_status: isReturningVisitor ? "returning" : "new",
    };
    if (visitorId) {
      eventMetadata = { ...eventMetadata, visitor_id: visitorId };
    }

    // Bot + internal flags on ALL events (never silently drop bots).
    if (likelyBot) {
      eventMetadata = { ...eventMetadata, likely_bot: true };
    }
    if (isInternalDevice()) {
      eventMetadata = { ...eventMetadata, internal: true };
    }

    // Never send client-claimed user_id / site / host — server resolves those.
    const {
      site: _clientSite,
      host: _clientHost,
      user_id: _clientUserId,
      ...safeMetadata
    } = eventMetadata as Record<string, unknown>;

    const eventData = {
      session_id: this.getSessionId(),
      visitor_id: visitorId || null,
      country_code: countryCode,
      event_type: eventType,
      event_category: eventCategory,
      event_metadata: safeMetadata,
      page_url: pageUrl || window.location.href,
      referrer: safeReferrer || null,
      user_agent: navigator.userAgent,
    };

    const body = JSON.stringify(eventData);

    const postFirstParty = (useKeepalive: boolean) => {
      try {
        if (
          useKeepalive &&
          typeof navigator !== "undefined" &&
          typeof navigator.sendBeacon === "function"
        ) {
          const blob = new Blob([body], { type: "application/json" });
          if (navigator.sendBeacon(FIRST_PARTY_ANALYTICS_PATH, blob)) {
            return;
          }
        }
        void fetch(FIRST_PARTY_ANALYTICS_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: useKeepalive,
          credentials: "same-origin",
        }).catch(() => {
          // unload / network — ignore
        });
      } catch {
        // unload — ignore
      }
    };

    if (keepalive) {
      postFirstParty(true);
      return;
    }

    try {
      const res = await fetch(FIRST_PARTY_ANALYTICS_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        credentials: "same-origin",
      });
      if (
        !res.ok &&
        process.env.NODE_ENV === "development" &&
        res.status >= 400
      ) {
        console.warn("[analytics] /api/e:", res.status);
      }
    } catch (e) {
      if (isAuthNetworkError(e)) return;
      if (process.env.NODE_ENV === "development") {
        console.warn("[analytics] /api/e:", e);
      }
    }
  }

  /**
   * One human-signal event per analytics session. The first of scroll, click,
   * keydown, or 10s visible wins; later calls are no-ops.
   */
  static trackSessionEngaged(
    trigger: "scroll" | "click" | "visible_10s" | "keydown",
  ) {
    const sessionId = this.getSessionId();
    if (!sessionId) return;
    emitOnce(`session_engaged:${sessionId}`, () => {
      void this.trackEvent({
        eventType: "session_engaged",
        eventCategory: "engagement",
        metadata: { trigger },
      });
    });
  }

  static trackPageView(metadata?: Record<string, any>) {
    return this.trackEvent({
      eventType: "page_view",
      eventCategory: "navigation",
      metadata,
    });
  }

  static trackAddToCart(
    productId: string,
    productName: string,
    price: number,
    extras?: {
      quantity?: number;
      source?: CartEventSource | string;
      list_price?: number;
      unit_price?: number;
      price_version?: string;
    },
  ) {
    const listPrice = extras?.list_price ?? price;
    return this.trackEvent({
      eventType: "add_to_cart",
      eventCategory: "cart",
      metadata: {
        productId,
        productName,
        price: listPrice,
        list_price: listPrice,
        ...(extras?.quantity != null ? { quantity: extras.quantity } : {}),
        ...(extras?.source ? { source: extras.source } : {}),
        ...(extras?.unit_price != null ? { unit_price: extras.unit_price } : {}),
        ...(extras?.price_version
          ? { price_version: extras.price_version }
          : {}),
      },
    });
  }

  /**
   * Add-to-cart failure. Metadata uses reason codes only — no error message / PII.
   */
  static trackAddToCartFailed(extras: {
    reason: AddToCartFailReason;
    productId?: string;
    source?: CartEventSource | string;
    http_status?: number;
  }) {
    return this.trackEvent({
      eventType: "add_to_cart_failed",
      eventCategory: "cart",
      metadata: {
        reason: extras.reason,
        ...(extras.productId ? { productId: extras.productId } : {}),
        ...(extras.source ? { source: extras.source } : {}),
        ...(extras.http_status != null
          ? { http_status: extras.http_status }
          : {}),
      },
    });
  }

  static trackPriceViewed(
    productId: string,
    extras?: {
      productName?: string;
      source?: "list" | "product" | "guide";
      list_price?: number;
      currency?: string;
    },
  ) {
    return this.trackEvent({
      eventType: "price_viewed",
      eventCategory: "navigation",
      metadata: {
        productId,
        ...(extras?.productName ? { productName: extras.productName } : {}),
        ...(extras?.source ? { source: extras.source } : {}),
        ...(extras?.list_price != null ? { list_price: extras.list_price } : {}),
        ...(extras?.currency ? { currency: extras.currency } : {}),
      },
    });
  }

  static trackPalletStatusViewed(extras?: {
    productId?: string;
    fill_percent?: number;
    bottles_remaining?: number;
    is_ready_to_ship?: boolean;
    source?: "product" | "list" | "checkout";
    /** Absolute fill count shown to the customer (may include cart). */
    fill_count?: number;
    capacity?: number;
    pallet_id?: string;
    /** Whether the thin fill bar is shown (CRO threshold). */
    show_bar?: boolean;
  }) {
    return this.trackEvent({
      eventType: "pallet_status_viewed",
      eventCategory: "navigation",
      metadata: {
        ...(extras?.productId ? { productId: extras.productId } : {}),
        ...(extras?.fill_percent != null
          ? { fill_percent: extras.fill_percent }
          : {}),
        ...(extras?.bottles_remaining != null
          ? { bottles_remaining: extras.bottles_remaining }
          : {}),
        ...(extras?.is_ready_to_ship != null
          ? { is_ready_to_ship: extras.is_ready_to_ship }
          : {}),
        ...(extras?.source ? { source: extras.source } : {}),
        ...(extras?.fill_count != null ? { fill_count: extras.fill_count } : {}),
        ...(extras?.capacity != null ? { capacity: extras.capacity } : {}),
        ...(extras?.pallet_id ? { pallet_id: extras.pallet_id } : {}),
        ...(extras?.show_bar != null ? { show_bar: extras.show_bar } : {}),
      },
    });
  }

  static trackCheckoutStarted(
    cartValue: number,
    itemCount: number,
    extras?: {
      /** @deprecated Ignored — site is derived server-side from Host. */
      site?: string;
      payment_method?: string;
      list_price?: number;
      unit_price?: number;
      price_version?: string;
      bottle_count?: number;
      cart_value?: number;
      step?: string;
      market?: string;
      currency?: string;
    },
  ) {
    return this.trackEvent({
      eventType: "checkout_started",
      eventCategory: "checkout",
      metadata: {
        cartValue,
        itemCount,
        cart_value: extras?.cart_value ?? cartValue,
        bottle_count: extras?.bottle_count ?? itemCount,
        ...(extras?.step ? { step: extras.step } : {}),
        ...(extras?.market ? { market: extras.market } : {}),
        ...(extras?.currency ? { currency: extras.currency } : {}),
        // site is set server-side on /api/e — do not default to 'pact' here
        payment_method: extras?.payment_method ?? "card",
        ...(extras?.list_price != null ? { list_price: extras.list_price } : {}),
        ...(extras?.unit_price != null ? { unit_price: extras.unit_price } : {}),
        ...(extras?.price_version
          ? { price_version: extras.price_version }
          : {}),
      },
    });
  }
}
