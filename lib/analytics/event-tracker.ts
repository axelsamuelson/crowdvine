import { isInternalDevice } from "@/lib/analytics/internal-device";
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
  }: TrackEventParams): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.isBotClient()) return;

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return;
    }

    let userId: string | null = null;
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

    const rawReferrer = referrer || document.referrer || "";
    const safeReferrer =
      /localhost|127\.0\.0\.1/i.test(rawReferrer) ? "" : rawReferrer;

    const eventMetadata = isInternalDevice()
      ? { ...metadata, internal: true }
      : metadata;

    const eventData = {
      user_id: userId,
      session_id: this.getSessionId(),
      event_type: eventType,
      event_category: eventCategory,
      event_metadata: eventMetadata,
      page_url: pageUrl || window.location.href,
      referrer: safeReferrer || null,
      user_agent: navigator.userAgent,
    };

    try {
      const { error } = await supabase.from("user_events").insert(eventData);
      if (error) {
        const m = error.message || "";
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
    extras?: { quantity?: number; source?: string },
  ) {
    return this.trackEvent({
      eventType: "add_to_cart",
      eventCategory: "cart",
      metadata: {
        productId,
        productName,
        price,
        ...(extras?.quantity != null ? { quantity: extras.quantity } : {}),
        ...(extras?.source ? { source: extras.source } : {}),
      },
    });
  }

  static trackCheckoutStarted(cartValue: number, itemCount: number) {
    return this.trackEvent({
      eventType: "checkout_started",
      eventCategory: "checkout",
      metadata: { cartValue, itemCount },
    });
  }
}
