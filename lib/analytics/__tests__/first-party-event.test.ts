import { describe, expect, it } from "vitest";
import {
  FIRST_PARTY_EVENT_MAX_BYTES,
  validateFirstPartyEventPayload,
  withServerSiteMetadata,
} from "@/lib/analytics/first-party-event";

const base = {
  user_id: null,
  session_id: "session_1234567890_abc",
  visitor_id: "vis_1",
  country_code: "SE",
  event_type: "page_view",
  event_category: "navigation",
  event_metadata: { path: "/vin" },
  page_url: "https://pactwines.com/vin",
  referrer: null,
  user_agent: "vitest",
};

describe("validateFirstPartyEventPayload", () => {
  it("accepts a valid payload", () => {
    const result = validateFirstPartyEventPayload(base);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.event_type).toBe("page_view");
    expect(result.event.country_code).toBe("SE");
  });

  it("rejects unknown event_type", () => {
    const result = validateFirstPartyEventPayload({
      ...base,
      event_type: "not_a_real_event",
    });
    expect(result).toEqual({
      ok: false,
      error: "Invalid event_type",
      status: 400,
    });
  });

  it("rejects unknown top-level fields", () => {
    const result = validateFirstPartyEventPayload({
      ...base,
      host: "evil.example",
      site: "pact",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/Unknown field/);
  });

  it("strips PII keys from metadata without rejecting", () => {
    const result = validateFirstPartyEventPayload({
      ...base,
      event_metadata: {
        email: "ada@example.com",
        phone: "0701234567",
        productId: "wine-1",
        site: "pact",
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.event_metadata).toEqual({ productId: "wine-1" });
  });

  it("rejects missing session_id", () => {
    const { session_id: _, ...rest } = base;
    const result = validateFirstPartyEventPayload(rest);
    expect(result).toMatchObject({
      ok: false,
      error: "Missing session_id",
      status: 400,
    });
  });

  it("rejects invalid user_id", () => {
    const result = validateFirstPartyEventPayload({
      ...base,
      user_id: "not-a-uuid",
    });
    expect(result).toMatchObject({
      ok: false,
      error: "Invalid user_id",
      status: 400,
    });
  });

  it("accepts add_to_cart_failed", () => {
    const result = validateFirstPartyEventPayload({
      ...base,
      event_type: "add_to_cart_failed",
      event_category: "cart",
      event_metadata: { reason: "http_error", http_status: 500 },
    });
    expect(result.ok).toBe(true);
  });
});

describe("withServerSiteMetadata", () => {
  it("overwrites client site and drops host", () => {
    expect(
      withServerSiteMetadata(
        { site: "pact", host: "client.example", productId: "x" },
        "dirtywine",
      ),
    ).toEqual({ productId: "x", site: "dirtywine" });
  });
});

describe("size constant", () => {
  it("keeps a sane body limit", () => {
    expect(FIRST_PARTY_EVENT_MAX_BYTES).toBe(16 * 1024);
  });
});
