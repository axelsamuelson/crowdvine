/**
 * Client-side Dirty Wine B2B funnel tracking.
 *
 * Shared by this PR (contact clicks) and the DIRTYWINE_CHECKOUT_MODE inquiry PR
 * (`b2b_inquiry_started` / `b2b_inquiry_submitted`). Never throws.
 *
 * Metadata must stay PII-free (no names, emails, phones, addresses, org numbers).
 */
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

export type B2bContactCta = "email" | "phone" | "instagram" | "link";

export type B2bInquiryTrackMeta = {
  page?: string;
  product_id?: string;
  source?: string;
  /** Bottle count estimate — digits only, not free text. */
  est_bottles?: number;
  wine_count?: number;
  /** Opaque UTM / campaign codes already present in first-touch; no free text. */
  source_utm?: string;
};

function currentPagePath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname || "";
}

function productIdFromPath(path: string): string | undefined {
  // /product/[handle] or localized variants — only pass through as opaque handle when present.
  const m = path.match(/\/(?:product|vin|wine)\/([^/?#]+)/i);
  return m?.[1] ? decodeURIComponent(m[1]) : undefined;
}

/**
 * Fire a B2B client event. Swallows all errors so UI flows never break.
 */
export function trackB2bClientEvent(
  eventType:
    | "b2b_contact_clicked"
    | "b2b_inquiry_started"
    | "b2b_inquiry_submitted",
  metadata: Record<string, unknown> = {},
): void {
  try {
    void AnalyticsTracker.trackEvent({
      eventType,
      eventCategory: "b2b",
      metadata,
    });
  } catch (e) {
    console.error(`trackB2bClientEvent ${eventType}:`, e);
  }
}

export function trackB2bContactClicked(opts: {
  cta: B2bContactCta;
  page?: string;
  product_id?: string;
  href?: string;
}): void {
  try {
    const page = opts.page ?? currentPagePath();
    const metadata: Record<string, unknown> = {
      cta: opts.cta,
      page,
    };
    const productId = opts.product_id ?? productIdFromPath(page);
    if (productId) metadata.product_id = productId;
    if (opts.href?.startsWith("mailto:")) metadata.cta = "email";
    else if (opts.href?.startsWith("tel:")) metadata.cta = "phone";
    trackB2bClientEvent("b2b_contact_clicked", metadata);
  } catch (e) {
    console.error("trackB2bContactClicked:", e);
  }
}

/** Opened the Dirty Wine order-inquiry flow (checkout replacement). */
export function trackB2bInquiryStarted(meta: B2bInquiryTrackMeta = {}): void {
  try {
    const page = meta.page ?? currentPagePath();
    const metadata: Record<string, unknown> = { page };
    const productId = meta.product_id ?? productIdFromPath(page);
    if (productId) metadata.product_id = productId;
    if (meta.source) metadata.source = meta.source;
    if (typeof meta.est_bottles === "number") metadata.est_bottles = meta.est_bottles;
    if (typeof meta.wine_count === "number") metadata.wine_count = meta.wine_count;
    if (meta.source_utm) metadata.source_utm = meta.source_utm;
    trackB2bClientEvent("b2b_inquiry_started", metadata);
  } catch (e) {
    console.error("trackB2bInquiryStarted:", e);
  }
}

/**
 * Inquiry conversion — order request submitted.
 * Prefer booleans/counts over free-text company fields in metadata.
 */
export function trackB2bInquirySubmitted(meta: B2bInquiryTrackMeta = {}): void {
  try {
    const page = meta.page ?? currentPagePath();
    const metadata: Record<string, unknown> = { page };
    const productId = meta.product_id ?? productIdFromPath(page);
    if (productId) metadata.product_id = productId;
    if (meta.source) metadata.source = meta.source;
    if (typeof meta.est_bottles === "number") metadata.est_bottles = meta.est_bottles;
    if (typeof meta.wine_count === "number") metadata.wine_count = meta.wine_count;
    if (meta.source_utm) metadata.source_utm = meta.source_utm;
    trackB2bClientEvent("b2b_inquiry_submitted", metadata);
  } catch (e) {
    console.error("trackB2bInquirySubmitted:", e);
  }
}

/** Classify a contact href for `b2b_contact_clicked` metadata.cta. */
export function classifyB2bContactCta(href: string): B2bContactCta {
  const h = href.trim().toLowerCase();
  if (h.startsWith("mailto:")) return "email";
  if (h.startsWith("tel:")) return "phone";
  if (h.includes("instagram.com")) return "instagram";
  return "link";
}
