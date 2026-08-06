import { isInternalDevice } from "@/lib/analytics/internal-device";
import {
  ensureVisitorIdentity,
  readFirstTouchForMetadata,
} from "@/lib/analytics/visitor-identity";
import { isStaleRefreshTokenError, isAuthNetworkError } from "@/lib/auth/session-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type EventType =
  // Access & Auth
  | "access_request_submitted"
  | "access_approved"
  | "access_denied"
  | "user_first_login"
  | "user_login"
  | "user_logout"
  | "signup_started"
  | "signup_completed"
  | "signup_abandoned"
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
  | "filter_used"
  | "collection_viewed"
  | "invite_shop_viewed"
  // Search
  | "search_submitted"
  | "search_result_clicked"
  // Cart & Validation
  | "add_to_cart"
  | "remove_from_cart"
  | "cart_opened"
  | "cart_validation_shown"
  | "cart_validation_passed"
  | "cart_validation_failed"
  | "why_modal_opened"
  // Checkout
  | "checkout_started"
  | "checkout_completed"
  | "reservation_completed"
  | "checkout_abandoned"
  | "checkout_step_viewed"
  | "payment_failed"
  | "age_verification_shown"
  | "age_verification_passed"
  | "age_verification_failed"
  | "terms_accepted"
  // Engagement
  | "scroll_depth"
  | "time_on_page"
  | "modal_opened"
  | "modal_closed"
  | "video_played"
  | "image_zoomed"
  | "tasting_flow_opened"
  // Account
  | "profile_updated"
  | "membership_tier_viewed"
  | "notification_settings_changed";

export type EventCategory =
  | "auth"
  | "invitation"
  | "navigation"
  | "search"
  | "cart"
  | "checkout"
  | "validation"
  | "engagement"
  | "account";

interface TrackEventParams {
  eventType: EventType;
  eventCategory: EventCategory;
  metadata?: Record<string, any>;
  pageUrl?: string;
  referrer?: string;
  /**
   * Use fetch keepalive so the insert survives page unload
   * (visibility hidden / pagehide / unmount). Skips auth lookup.
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
    return /bot|crawl|spider|headless|lighthouse|slurp/i.test(ua);
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
    if (this.isBotClient()) return;

    const rawReferrer = referrer || document.referrer || "";
    const safeReferrer =
      /localhost|127\.0\.0\.1/i.test(rawReferrer) ? "" : rawReferrer;

    const { visitorId } = ensureVisitorIdentity();

    let eventMetadata: Record<string, unknown> = { ...metadata };
    if (
      eventType === "reservation_completed" ||
      eventType === "signup_completed"
    ) {
      const firstTouch = readFirstTouchForMetadata();
      if (firstTouch) {
        eventMetadata = { ...eventMetadata, first_touch: firstTouch };
      }
      if (visitorId) {
        eventMetadata = { ...eventMetadata, visitor_id: visitorId };
      }
    }
    // Internal devices are tagged, never skipped.
    if (isInternalDevice()) {
      eventMetadata = { ...eventMetadata, internal: true };
    }

    let userId: string | null = null;

    if (!keepalive) {
      let supabase;
      try {
        supabase = getSupabaseBrowserClient();
      } catch {
        return;
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) {
          if (isStaleRefreshTokenError(authError)) {
            await supabase.auth.signOut({ scope: "local" });
          } else if (process.env.NODE_ENV === "development") {
            console.warn("[analytics] auth.getUser:", authError.message);
          }
        } else {
          userId = user?.id ?? null;
        }
      } catch (e) {
        if (isStaleRefreshTokenError(e)) {
          await supabase.auth.signOut({ scope: "local" });
        } else if (
          !isAuthNetworkError(e) &&
          process.env.NODE_ENV === "development"
        ) {
          console.warn("[analytics] auth.getUser:", e);
        }
      }
    }

    const eventData = {
      user_id: userId,
      session_id: this.getSessionId(),
      visitor_id: visitorId || null,
      event_type: eventType,
      event_category: eventCategory,
      event_metadata: eventMetadata,
      page_url: pageUrl || window.location.href,
      referrer: safeReferrer || null,
      user_agent: navigator.userAgent,
    };

    if (keepalive) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) return;
      try {
        void fetch(`${supabaseUrl}/rest/v1/user_events`, {
          method: "POST",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(eventData),
          keepalive: true,
        });
      } catch {
        // unload — ignore
      }
      return;
    }

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return;
    }

    try {
      const { error } = await supabase.from("user_events").insert(eventData);
      if (error) {
        const m = error.message || "";
        // Pre-migration: visitor_id column may not exist yet.
        if (/visitor_id|schema cache|Could not find/i.test(m)) {
          const { visitor_id: _omit, ...withoutVisitor } = eventData;
          const retry = await supabase.from("user_events").insert(withoutVisitor);
          if (retry.error && process.env.NODE_ENV === "development") {
            console.warn("[analytics] user_events insert:", retry.error.message);
          }
          return;
        }
        if (
          process.env.NODE_ENV === "development" &&
          m &&
          !/failed to fetch|fetch/i.test(m)
        ) {
          console.warn("[analytics] user_events insert:", m);
        }
      }
    } catch (e) {
      if (isAuthNetworkError(e)) return;
      if (process.env.NODE_ENV === "development") {
        console.warn("[analytics] user_events:", e);
      }
    }
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
      source?: string;
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

  static trackCheckoutStarted(
    cartValue: number,
    itemCount: number,
    extras?: {
      site?: string;
      payment_method?: string;
      list_price?: number;
      unit_price?: number;
      price_version?: string;
      bottle_count?: number;
      cart_value?: number;
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
        site: extras?.site ?? "pact",
        payment_method: extras?.payment_method ?? "deferred_link",
        ...(extras?.list_price != null ? { list_price: extras.list_price } : {}),
        ...(extras?.unit_price != null ? { unit_price: extras.unit_price } : {}),
        ...(extras?.price_version
          ? { price_version: extras.price_version }
          : {}),
      },
    });
  }
}
