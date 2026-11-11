import { describe, expect, it } from "vitest";
import {
  FIRST_PARTY_EVENT_MAX_BYTES,
  validateFirstPartyEventPayload,
  withServerSiteMetadata,
} from "@/lib/analytics/first-party-event";

const base = {
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
    expect(result.event).not.toHaveProperty("user_id");
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

  it("rejects server-only event_type checkout_completed", () => {
    const result = validateFirstPartyEventPayload({
      ...base,
      event_type: "checkout_completed",
      event_category: "checkout",
    });
    expect(result).toEqual({
      ok: false,
      error: "Invalid event_type",
      status: 400,
    });
  });

  it("strips client user_id / host / site without rejecting", () => {
    const result = validateFirstPartyEventPayload({
      ...base,
      user_id: "11111111-1111-4111-8111-111111111111",
      host: "evil.example",
      site: "pact",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event).not.toHaveProperty("user_id");
  });

  it("rejects other unknown top-level fields", () => {
    const result = validateFirstPartyEventPayload({
      ...base,
      forged_field: true,
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

  it("accepts add_to_cart_failed", () => {
    const result = validateFirstPartyEventPayload({
      ...base,
      event_type: "add_to_cart_failed",
      event_category: "cart",
      event_metadata: { reason: "http_error", http_status: 500 },
    });
    expect(result.ok).toBe(true);
  });

  it("accepts sticky_atc_shown / sticky_atc_clicked with Camille metadata (no PII)", () => {
    const meta = {
      main_cta_hidden: true,
      scroll_depth: 0.42,
      viewport: "mobile:390",
      wine_id: "wine_abc",
      email: "should-strip@example.com",
    };
    for (const event_type of ["sticky_atc_shown", "sticky_atc_clicked"] as const) {
      const result = validateFirstPartyEventPayload({
        ...base,
        event_type,
        event_category: "cart",
        event_metadata: meta,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.event.event_metadata).toEqual({
        main_cta_hidden: true,
        scroll_depth: 0.42,
        viewport: "mobile:390",
        wine_id: "wine_abc",
      });
      expect(result.event.event_metadata).not.toHaveProperty("email");
    }
  });

  it("accepts six_pack_rule_viewed with surface allowlist values", () => {
    for (const surface of ["pdp_info", "first_add", "cart"] as const) {
      const result = validateFirstPartyEventPayload({
        ...base,
        event_type: "six_pack_rule_viewed",
        event_category: "engagement",
        event_metadata: { surface, name: "PII" },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.event.event_metadata).toEqual({ surface });
      expect(result.event.event_metadata).not.toHaveProperty("name");
    }
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
