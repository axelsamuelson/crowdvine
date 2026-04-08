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

  static async trackEvent({
    eventType,
    eventCategory,
    metadata = {},
    pageUrl,
    referrer,
  }: TrackEventParams): Promise<void> {
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const eventData = {
        user_id: user?.id || null,
        session_id: this.getSessionId(),
        event_type: eventType,
        event_category: eventCategory,
        event_metadata: metadata,
        page_url:
          pageUrl ||
          (typeof window !== "undefined" ? window.location.href : ""),
        referrer:
          referrer ||
          (typeof window !== "undefined" ? document.referrer : ""),
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : "",
      };

      await supabase.from("user_events").insert(eventData);
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  }

  static trackPageView(metadata?: Record<string, any>) {
    return this.trackEvent({
      eventType: "page_view",
      eventCategory: "navigation",
      metadata,
    });
  }

  static trackAddToCart(productId: string, productName: string, price: number) {
    return this.trackEvent({
      eventType: "add_to_cart",
      eventCategory: "cart",
      metadata: { productId, productName, price },
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
