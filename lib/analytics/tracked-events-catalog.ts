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
  {
    eventType: "auth_email_step_shown",
    category: "auth",
    description:
      "E-post/inloggnings-UI visades (checkout “Skicka inloggningslänk” eller /signup). Legacy: signup_started.",
    sources: ["client"],
  },
  {
    eventType: "auth_email_step_completed",
    category: "auth",
    description:
      "Magic-link/OTP lyckades — användaren har en autentiserad session. Legacy: signup_completed.",
    sources: ["server", "client"],
  },
  {
    eventType: "auth_email_step_abandoned",
    category: "auth",
    description:
      "Checkout e-poststeg lämnades efter att e-post angetts utan slutförd inloggning. Legacy: signup_abandoned.",
    sources: ["client"],
  },
  {
    eventType: "auth_email_link_sent",
    category: "auth",
    description:
      "Användaren skickade magic link/OTP till en e-postadress i checkout (metadata.email).",
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
    eventType: "price_viewed",
    category: "navigation",
    description:
      "Price became visible in viewport (list card or product page). Metadata: productId, source (list|product|guide), list_price.",
    sources: ["client"],
  },
  {
    eventType: "pallet_status_viewed",
    category: "navigation",
    description:
      "Pallet fill/status bar became visible. Metadata: fill_percent, bottles_remaining, is_ready_to_ship.",
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
  {
    eventType: "guide_filter",
    category: "navigation",
    description: "Guides hub section filter applied (client-side, no URL param).",
    sources: ["client"],
  },
  // cart
  {
    eventType: "add_to_cart",
    category: "cart",
    description:
      "Reserve / add-to-cart click. Metadata.source: list | product | guide (also legacy pdp_case / b2b).",
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
    description:
      "Cart failed 6-bottle (or similar) rules. Metadata: required_quantity, needed_total, invalid_count.",
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
    description:
      "Payment captured successfully (server: checkout confirm payment_intent or Stripe webhook).",
    sources: ["server"],
  },
  {
    eventType: "reservation_completed",
    category: "checkout",
    description:
      "Reservation created (server: checkout confirm). May be paid or pending setup_intent — see metadata.payment_status.",
    sources: ["server"],
  },
  {
    eventType: "checkout_abandoned",
    category: "checkout",
    description:
      "Checkout lämnas via pagehide/dold flik innan betalning klar. Metadata: step, abandon_reason, field/code when known. No PII — only field-filled booleans + postal digits.",
    sources: ["client"],
  },
  {
    eventType: "checkout_step_viewed",
    category: "checkout",
    description:
      "Ett kassasteg visades (metadata.step: postal | delivery | age_terms | payment). En gång per steg och besök, efter checkout_started.",
    sources: ["client"],
  },
  {
    eventType: "checkout_step_completed",
    category: "checkout",
    description:
      "Ett kassasteg blev klart (metadata.step). En gång per steg och besök.",
    sources: ["client"],
  },
  {
    eventType: "checkout_error",
    category: "checkout",
    description:
      "Validering eller betalning misslyckades. Metadata: step, field, code (postal_invalid, postal_out_of_zone, market_not_available, age_under_minimum, terms_not_accepted, card_declined, setup_intent_failed, server_error).",
    sources: ["client"],
  },
  {
    eventType: "delivery_ineligible",
    category: "checkout",
    description:
      "Besökarens marknad kan inte checka ut. Metadata: country, reason.",
    sources: ["client"],
  },
  {
    eventType: "checkout_postal_started",
    category: "checkout",
    description:
      "Besökaren började skriva postnummer i checkout (första tecknet). Metadata: postal_digits (digits only), digits, complete.",
    sources: ["client"],
  },
  {
    eventType: "checkout_delivery_captured",
    category: "checkout",
    description:
      "Leverans-/kontaktfält kompletta (privacy-safe flags only: has_full_name, has_email, etc. — never raw PII).",
    sources: ["client"],
  },
  {
    eventType: "checkout_zone_error",
    category: "checkout",
    description:
      "Leveranszon kunde inte matchas (NO_DELIVERY_ZONE / UNSUPPORTED_COUNTRY). Metadata: zoneError, postal_digits (digits only), country_code.",
    sources: ["client"],
  },
  {
    eventType: "checkout_stripe_confirm_failed",
    category: "checkout",
    description:
      "Kort-/betalningsfel vid Stripe confirmation (deklinetsvar). Metadata: intentStatus, code, type, decline_code, paymentMode.",
    sources: ["client"],
  },
  {
    eventType: "checkout_confirm_failed",
    category: "checkout",
    description:
      "POST /api/checkout/confirm misslyckades (HTTP/nätverk). Inte Stripe-kortnekat. Legacy: payment_failed.",
    sources: ["client"],
  },
  {
    eventType: "checkout_login_wall_shown",
    category: "checkout",
    description:
      "Login / magic-link wall shown mid-checkout (anonymous user must authenticate before payment).",
    sources: ["client"],
  },
  {
    eventType: "checkout_membership_wall_shown",
    category: "checkout",
    description:
      "Membership / access gate shown that blocks checkout progress.",
    sources: ["client"],
  },
  {
    eventType: "age_confirmation_shown",
    category: "checkout",
    description:
      "Födelsedatum/åldersbekräftelse visades i checkout. Legacy: age_verification_shown.",
    sources: ["client"],
  },
  {
    eventType: "age_confirmed",
    category: "checkout",
    description:
      "Användaren bekräftade ålder (giltigt födelsedatum). Metadata: has_date_of_birth=true, required_age — never raw DOB. Legacy: age_verification_passed.",
    sources: ["client"],
  },
  {
    eventType: "age_confirmation_failed",
    category: "checkout",
    description:
      "Åldersbekräftelse underkänd. Metadata: required_age, code — never raw DOB. Legacy: age_verification_failed.",
    sources: ["client"],
  },
  {
    eventType: "terms_accepted",
    category: "checkout",
    description: "User accepted köpvillkor at checkout.",
    sources: ["client"],
  },
  {
    eventType: "producer_reservation_approved",
    category: "checkout",
    description:
      "Producer (or admin acting as producer) approved a reservation. Metadata: reservation_id, status.",
    sources: ["server"],
  },
  {
    eventType: "producer_reservation_rejected",
    category: "checkout",
    description:
      "Producer rejected/declined a reservation. Metadata: reservation_id, status.",
    sources: ["server"],
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
    description: "Scroll depth milestone (25/50/75/100) on PDP / how-it-works.",
    sources: ["client"],
  },
  {
    eventType: "session_engaged",
    category: "engagement",
    description:
      "One human signal per session: first of scroll > 25%, click, keydown, or 10s continuously visible. Metadata.trigger is which one fired.",
    sources: ["client"],
  },
  {
    eventType: "time_on_page",
    category: "engagement",
    description: "Time on page / dwell on PDP / how-it-works.",
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
