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

const ALLOWED_EVENT_TYPES = new Set<string>(
  TRACKED_USER_EVENTS_CATALOG.map((e) => e.eventType),
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
  "user_id",
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FirstPartyEventPayload = {
  user_id: string | null;
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
 * Does not trust or keep client host/site — caller sets those from Host.
 */
export function validateFirstPartyEventPayload(
  raw: unknown,
): FirstPartyEventValidationOk | FirstPartyEventValidationErr {
  if (!isPlainObject(raw)) {
    return { ok: false, error: "Invalid payload", status: 400 };
  }

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_TOP_LEVEL.has(key)) {
      return { ok: false, error: `Unknown field: ${key}`, status: 400 };
    }
  }

  const eventType = raw.event_type;
  if (typeof eventType !== "string" || !ALLOWED_EVENT_TYPES.has(eventType)) {
    return { ok: false, error: "Invalid event_type", status: 400 };
  }

  const eventCategory = raw.event_category;
  if (
    typeof eventCategory !== "string" ||
    !ALLOWED_CATEGORIES.has(eventCategory as EventCategory)
  ) {
    return { ok: false, error: "Invalid event_category", status: 400 };
  }

  const sessionRaw = raw.session_id;
  if (typeof sessionRaw !== "string" || !sessionRaw.trim()) {
    return { ok: false, error: "Missing session_id", status: 400 };
  }
  const session_id = truncate(sessionRaw.trim(), FIRST_PARTY_SESSION_ID_MAX);

  let user_id: string | null = null;
  if (raw.user_id != null) {
    if (typeof raw.user_id !== "string" || !UUID_RE.test(raw.user_id.trim())) {
      return { ok: false, error: "Invalid user_id", status: 400 };
    }
    user_id = raw.user_id.trim();
  }

  let visitor_id: string | null = null;
  if (raw.visitor_id != null && raw.visitor_id !== "") {
    if (typeof raw.visitor_id !== "string") {
      return { ok: false, error: "Invalid visitor_id", status: 400 };
    }
    visitor_id = truncate(raw.visitor_id.trim(), FIRST_PARTY_VISITOR_ID_MAX) || null;
  }

  let country_code: string | null = null;
  if (raw.country_code != null && raw.country_code !== "") {
    if (typeof raw.country_code !== "string") {
      return { ok: false, error: "Invalid country_code", status: 400 };
    }
    const cc = raw.country_code.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(cc) && cc !== "XX") country_code = cc;
  }

  let event_metadata: Record<string, unknown> = {};
  if (raw.event_metadata != null) {
    if (!isPlainObject(raw.event_metadata)) {
      return { ok: false, error: "Invalid event_metadata", status: 400 };
    }
    event_metadata = sanitizeMetadataObject(raw.event_metadata);
    const metaBytes = Buffer.byteLength(JSON.stringify(event_metadata), "utf8");
    if (metaBytes > FIRST_PARTY_METADATA_MAX_BYTES) {
      return { ok: false, error: "event_metadata too large", status: 413 };
    }
  }

  const page_url =
    typeof raw.page_url === "string"
      ? truncate(raw.page_url.trim(), FIRST_PARTY_PAGE_URL_MAX) || null
      : null;
  const referrer =
    typeof raw.referrer === "string"
      ? truncate(raw.referrer.trim(), FIRST_PARTY_REFERRER_MAX) || null
      : null;
  const user_agent =
    typeof raw.user_agent === "string"
      ? truncate(raw.user_agent.trim(), FIRST_PARTY_USER_AGENT_MAX) || null
      : null;

  return {
    ok: true,
    event: {
      user_id,
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
