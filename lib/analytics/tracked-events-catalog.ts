import type { EventCategory, EventType } from "./event-tracker";

export type TrackedEventSource = "client" | "server";

export type TrackedEventCatalogEntry = {
  eventType: EventType;
  category: EventCategory;
  description: string;
  sources: TrackedEventSource[];
};

/**
 * Every value in EventType must appear exactly once.
 */
export const TRACKED_USER_EVENTS_CATALOG: TrackedEventCatalogEntry[] = [
  // auth
  {
    eventType: "access_request_submitted",
    category: "auth",
    description:
      "Visitor submitted the access request form (email gate / waitlist).",
    sources: ["client"],
  },
  {
    eventType: "access_approved",
    category: "auth",
    description: "Access was approved (e.g. after invitation / code flow).",
    sources: ["client"],
  },
  {
    eventType: "access_denied",
    category: "auth",
    description: "Access denied or rejected (reserved for future use).",
    sources: ["client"],
  },
  {
    eventType: "user_first_login",
    category: "auth",
    description: "First successful login for the account.",
    sources: ["client"],
  },
  {
    eventType: "user_login",
    category: "auth",
    description: "Subsequent logins (reserved / use when wired).",
    sources: ["client"],
  },
  {
    eventType: "user_logout",
    category: "auth",
    description: "User logged out (reserved / use when wired).",
    sources: ["client"],
  },
  // invitation
  {
    eventType: "invitation_link_opened",
    category: "invitation",
    description:
      "User landed on an invitation URL (/i, /ib, /p with code, or invite-signup with ?invite=).",
    sources: ["client"],
  },
  {
    eventType: "invitation_signup_started",
    category: "invitation",
    description:
      "User began the invitation signup form (first field interaction).",
    sources: ["client"],
  },
  {
    eventType: "invitation_signup_completed",
    category: "invitation",
    description: "Account successfully created via invitation redeem API.",
    sources: ["server"],
  },
  {
    eventType: "invitation_code_invalid",
    category: "invitation",
    description:
      "Invitation validation failed (wrong code, inactive, already used, etc.). Metadata includes reason.",
    sources: ["client", "server"],
  },
  {
    eventType: "invitation_code_expired",
    category: "invitation",
    description: "Invitation code past expires_at.",
    sources: ["client", "server"],
  },
  {
    eventType: "invitation_generated",
    category: "invitation",
    description: "Member generated a new invitation code (API).",
    sources: ["server"],
  },
  {
    eventType: "invitation_shared",
    category: "invitation",
    description: "User copied an invite link from the profile invite page.",
    sources: ["client"],
  },
  // navigation
  {
    eventType: "page_view",
    category: "navigation",
    description: "Generic page view via trackPageView().",
    sources: ["client"],
  },
  {
    eventType: "producer_viewed",
    category: "navigation",
    description:
      "Shop PLP with producer filter(s) from URL (multi-producer browse).",
    sources: ["client"],
  },
  {
    eventType: "product_list_viewed",
    category: "navigation",
    description: "Product list / collection view with context metadata.",
    sources: ["client"],
  },
  {
    eventType: "product_viewed",
    category: "navigation",
    description: "Product detail page (PDP) view.",
    sources: ["client"],
  },
  {
    eventType: "filter_used",
    category: "navigation",
    description:
      "Shop sidebar filters applied (color, grape, source, producer).",
    sources: ["client"],
  },
  {
    eventType: "collection_viewed",
    category: "navigation",
    description: "User viewed a specific collection PLP (non-root handle).",
    sources: ["client"],
  },
  {
    eventType: "invite_shop_viewed",
    category: "navigation",
    description:
      "B2B invite landing showed the inline product grid (Invite wines section).",
    sources: ["client"],
  },
  // search
  {
    eventType: "search_submitted",
    category: "search",
    description: "Shop search executed (?q present on PLP load).",
    sources: ["client"],
  },
  {
    eventType: "search_result_clicked",
    category: "search",
    description: "User opened a product from PLP while a search query was active.",
    sources: ["client"],
  },
  // cart
  {
    eventType: "add_to_cart",
    category: "cart",
    description: "Item added to cart from PDP or product card.",
    sources: ["client"],
  },
  {
    eventType: "remove_from_cart",
    category: "cart",
    description: "Line item removed from cart (quantity set to 0 / delete).",
    sources: ["client"],
  },
  {
    eventType: "cart_opened",
    category: "cart",
    description: "Cart drawer opened (manual or after add-to-cart auto-open).",
    sources: ["client"],
  },
  // validation
  {
    eventType: "cart_validation_shown",
    category: "validation",
    description: "Cart validation UI surfaced (reserved).",
    sources: ["client"],
  },
  {
    eventType: "cart_validation_passed",
    category: "validation",
    description: "Cart passed minimum rules (e.g. per-producer minimum).",
    sources: ["client"],
  },
  {
    eventType: "cart_validation_failed",
    category: "validation",
    description: "Cart failed validation rules (reserved).",
    sources: ["client"],
  },
  // checkout
  {
    eventType: "checkout_started",
    category: "checkout",
    description: "Checkout / payment setup flow started.",
    sources: ["client", "server"],
  },
  {
    eventType: "checkout_completed",
    category: "checkout",
    description: "Checkout completed successfully (reserved).",
    sources: ["client"],
  },
  {
    eventType: "reservation_completed",
    category: "checkout",
    description: "Reservation flow completed (reserved).",
    sources: ["client"],
  },
  {
    eventType: "checkout_abandoned",
    category: "checkout",
    description: "User left the checkout page before finishing (unmount).",
    sources: ["client"],
  },
  {
    eventType: "checkout_step_viewed",
    category: "checkout",
    description: "Checkout wizard step changed (metadata: step number).",
    sources: ["client"],
  },
  {
    eventType: "payment_failed",
    category: "checkout",
    description:
      "Reservation / confirm step failed (HTTP error; no card details in metadata).",
    sources: ["client"],
  },
  // engagement
  {
    eventType: "why_modal_opened",
    category: "engagement",
    description: "“Why six bottles” help opened from cart header.",
    sources: ["client"],
  },
  {
    eventType: "scroll_depth",
    category: "engagement",
    description: "Scroll depth milestone (reserved).",
    sources: ["client"],
  },
  {
    eventType: "time_on_page",
    category: "engagement",
    description: "Time on page / dwell (reserved).",
    sources: ["client"],
  },
  {
    eventType: "modal_opened",
    category: "engagement",
    description: "Generic modal opened (reserved).",
    sources: ["client"],
  },
  {
    eventType: "modal_closed",
    category: "engagement",
    description: "Generic modal closed (reserved).",
    sources: ["client"],
  },
  {
    eventType: "video_played",
    category: "engagement",
    description: "Video engagement (reserved / wire when PDP has video).",
    sources: ["client"],
  },
  {
    eventType: "image_zoomed",
    category: "engagement",
    description: "User clicked to enlarge PDP gallery image.",
    sources: ["client"],
  },
  {
    eventType: "tasting_flow_opened",
    category: "engagement",
    description: "User opened a tasting session page (/tasting/[code]).",
    sources: ["client"],
  },
  // account
  {
    eventType: "profile_updated",
    category: "account",
    description: "Profile saved successfully from profile or edit page.",
    sources: ["client"],
  },
  {
    eventType: "membership_tier_viewed",
    category: "account",
    description: "Profile loaded with membership data (tier visible).",
    sources: ["client"],
  },
  {
    eventType: "notification_settings_changed",
    category: "account",
    description: "Notification preferences changed (reserved / wire when UI exists).",
    sources: ["client"],
  },
];

type ListedEventTypes =
  (typeof TRACKED_USER_EVENTS_CATALOG)[number]["eventType"];

type _EnsureAllEventTypesAreListed = Exclude<
  EventType,
  ListedEventTypes
> extends never
  ? true
  : never;

const _catalogComplete: _EnsureAllEventTypesAreListed = true;
void _catalogComplete;

export const TRACKED_EVENTS_CATEGORY_ORDER: EventCategory[] = [
  "auth",
  "invitation",
  "navigation",
  "search",
  "cart",
  "validation",
  "checkout",
  "engagement",
  "account",
];

export const TRACKED_EVENTS_CATEGORY_LABEL: Record<EventCategory, string> = {
  auth: "Access & authentication",
  invitation: "Invitations",
  navigation: "Navigation",
  search: "Search",
  cart: "Cart",
  validation: "Cart validation",
  checkout: "Checkout",
  engagement: "Engagement",
  account: "Account",
};

export function groupTrackedEventsByCategory(): Map<
  EventCategory,
  TrackedEventCatalogEntry[]
> {
  const map = new Map<EventCategory, TrackedEventCatalogEntry[]>();
  for (const cat of TRACKED_EVENTS_CATEGORY_ORDER) {
    map.set(cat, []);
  }
  for (const row of TRACKED_USER_EVENTS_CATALOG) {
    map.get(row.category)!.push(row);
  }
  for (const rows of map.values()) {
    rows.sort((a, b) => a.eventType.localeCompare(b.eventType));
  }
  return map;
}
