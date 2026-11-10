import type { EventCategory, EventType } from "@/lib/analytics/event-tracker";
import { TRACKED_USER_EVENTS_CATALOG } from "@/lib/analytics/tracked-events-catalog";
import type { AnalyticsEventSite } from "@/lib/analytics/request-site";

export const FIRST_PARTY_EVENT_MAX_BYTES = 16 * 1024;
export const FIRST_PARTY_METADATA_MAX_BYTES = 8 * 1024;
export const FIRST_PARTY_PAGE_URL_MAX = 2048;
export const FIRST_PARTY_REFERRER_MAX = 2048;
export const FIRST_PARTY_USER_AGENT_MAX = 512;
export const FIRST_PARTY_SESSION_ID_MAX = 128;
export const FIRST_PARTY_VISITOR_ID_MAX = 128;
export const FIRST_PARTY_METADATA_MAX_KEYS = 64;
export const FIRST_PARTY_METADATA_MAX_DEPTH = 4;

/** Only catalog events that may be emitted from the browser. */
const ALLOWED_EVENT_TYPES = new Set<string>(
  TRACKED_USER_EVENTS_CATALOG.filter((e) => e.sources.includes("client")).map(
    (e) => e.eventType,
  ),
);

const ALLOWED_CATEGORIES = new Set<EventCategory>([
  "auth",
  "invitation",
  "navigation",
  "search",
  "cart",
  "checkout",
  "validation",
  "engagement",
  "account",
  "b2b",
]);

/** Top-level keys accepted from the client payload. */
const ALLOWED_TOP_LEVEL = new Set([
  "session_id",
  "visitor_id",
  "country_code",
  "event_type",
  "event_category",
  "event_metadata",
  "page_url",
  "referrer",
  "user_agent",
]);

/** Legacy/client noise: stripped before validation, never trusted. */
const STRIPPED_TOP_LEVEL = new Set(["user_id", "host", "site"]);

/**
 * Metadata keys that must never be stored (PII / contact / free-text identity).
 * Values are stripped; we do not expand or accept them.
 */
const BLOCKED_METADATA_KEYS = new Set([
  "email",
  "e-mail",
  "mail",
  "name",
  "full_name",
  "fullname",
  "lastname",
  "first_name",
  "last_name",
  "phone",
  "telephone",
  "mobile",
  "street",
  "address",
  "address1",
  "address2",
  "line1",
  "line2",
  "city",
  "postal_code",
  "postcode",
  "zip",
  "date_of_birth",
  "dob",
  "birth_date",
  "birthday",
  "password",
  "ssn",
  "personnummer",
  "ip",
  "ip_address",
  "host",
  // site is overwritten server-side — never accept client value
  "site",
]);

export type FirstPartyEventPayload = {
  session_id: string;
  visitor_id: string | null;
  country_code: string | null;
  event_type: EventType;
  event_category: EventCategory;
  event_metadata: Record<string, unknown>;
  page_url: string | null;
  referrer: string | null;
  user_agent: string | null;
};

export type FirstPartyEventValidationOk = {
  ok: true;
  event: FirstPartyEventPayload;
};

export type FirstPartyEventValidationErr = {
  ok: false;
  error: string;
  status: 400 | 413;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

function sanitizeMetadataValue(
  value: unknown,
  depth: number,
): unknown {
  if (depth > FIRST_PARTY_METADATA_MAX_DEPTH) return null;
  if (value == null) return value;
  if (typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) return null;
    return value;
  }
  if (typeof value === "string") {
    return truncate(value, 500);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => sanitizeMetadataValue(item, depth + 1));
  }
  if (isPlainObject(value)) {
    return sanitizeMetadataObject(value, depth + 1);
  }
  return null;
}

function sanitizeMetadataObject(
  raw: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let keys = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (keys >= FIRST_PARTY_METADATA_MAX_KEYS) break;
    const k = key.trim().slice(0, 64);
    if (!k) continue;
    if (BLOCKED_METADATA_KEYS.has(k.toLowerCase())) continue;
    // Nested objects may still contain blocked keys.
    out[k] = sanitizeMetadataValue(value, depth);
    keys += 1;
  }
  return out;
}

/**
 * Validate + sanitize a client analytics payload.
 * Does not trust or keep client host/site/user_id — caller sets those server-side.
 */
export function validateFirstPartyEventPayload(
  raw: unknown,
): FirstPartyEventValidationOk | FirstPartyEventValidationErr {
  if (!isPlainObject(raw)) {
    return { ok: false, error: "Invalid payload", status: 400 };
  }

  // Strip untrusted identity / site fields; never reject solely for their presence.
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (STRIPPED_TOP_LEVEL.has(key)) continue;
    cleaned[key] = value;
  }

  for (const key of Object.keys(cleaned)) {
    if (!ALLOWED_TOP_LEVEL.has(key)) {
      return { ok: false, error: `Unknown field: ${key}`, status: 400 };
    }
  }

  const eventType = cleaned.event_type;
  if (typeof eventType !== "string" || !ALLOWED_EVENT_TYPES.has(eventType)) {
    return { ok: false, error: "Invalid event_type", status: 400 };
  }

  const eventCategory = cleaned.event_category;
  if (
    typeof eventCategory !== "string" ||
    !ALLOWED_CATEGORIES.has(eventCategory as EventCategory)
  ) {
    return { ok: false, error: "Invalid event_category", status: 400 };
  }

  const sessionRaw = cleaned.session_id;
  if (typeof sessionRaw !== "string" || !sessionRaw.trim()) {
    return { ok: false, error: "Missing session_id", status: 400 };
  }
  const session_id = truncate(sessionRaw.trim(), FIRST_PARTY_SESSION_ID_MAX);

  let visitor_id: string | null = null;
  if (cleaned.visitor_id != null && cleaned.visitor_id !== "") {
    if (typeof cleaned.visitor_id !== "string") {
      return { ok: false, error: "Invalid visitor_id", status: 400 };
    }
    visitor_id =
      truncate(cleaned.visitor_id.trim(), FIRST_PARTY_VISITOR_ID_MAX) || null;
  }

  let country_code: string | null = null;
  if (cleaned.country_code != null && cleaned.country_code !== "") {
    if (typeof cleaned.country_code !== "string") {
      return { ok: false, error: "Invalid country_code", status: 400 };
    }
    const cc = cleaned.country_code.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(cc) && cc !== "XX") country_code = cc;
  }

  let event_metadata: Record<string, unknown> = {};
  if (cleaned.event_metadata != null) {
    if (!isPlainObject(cleaned.event_metadata)) {
      return { ok: false, error: "Invalid event_metadata", status: 400 };
    }
    event_metadata = sanitizeMetadataObject(cleaned.event_metadata);
    const metaBytes = Buffer.byteLength(JSON.stringify(event_metadata), "utf8");
    if (metaBytes > FIRST_PARTY_METADATA_MAX_BYTES) {
      return { ok: false, error: "event_metadata too large", status: 413 };
    }
  }

  const page_url =
    typeof cleaned.page_url === "string"
      ? truncate(cleaned.page_url.trim(), FIRST_PARTY_PAGE_URL_MAX) || null
      : null;
  const referrer =
    typeof cleaned.referrer === "string"
      ? truncate(cleaned.referrer.trim(), FIRST_PARTY_REFERRER_MAX) || null
      : null;
  const user_agent =
    typeof cleaned.user_agent === "string"
      ? truncate(cleaned.user_agent.trim(), FIRST_PARTY_USER_AGENT_MAX) || null
      : null;

  return {
    ok: true,
    event: {
      session_id,
      visitor_id,
      country_code,
      event_type: eventType as EventType,
      event_category: eventCategory as EventCategory,
      event_metadata,
      page_url,
      referrer,
      user_agent,
    },
  };
}

/** Attach server-derived site onto metadata (overwrites any client value). */
export function withServerSiteMetadata(
  metadata: Record<string, unknown>,
  site: AnalyticsEventSite,
): Record<string, unknown> {
  const { site: _clientSite, host: _clientHost, ...rest } = metadata;
  return { ...rest, site };
}
