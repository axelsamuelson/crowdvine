import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/b2b/inquiry-stock", () => ({
  assertInquiryLinesInB2bStock: vi.fn(),
}));

vi.mock("@/lib/b2b/inquiry-pricing", () => ({
  applyServerInquiryLinePrices: vi.fn(async (_sb, lines) =>
    lines.map(
      (line: {
        wineId: string;
        wineTitle: string;
        quantity: number;
        unitPriceCents: number | null;
      }) => ({
        ...line,
        // Server-authoritative B2B excl. VAT (ignores client B2C/1.25)
        unitPriceCents: 13200,
      }),
    ),
  ),
}));

vi.mock("@/lib/b2b/inquiry-emails", () => ({
  sendB2bInquiryCustomerEmail: vi.fn(),
  sendB2bInquiryInternalNotify: vi.fn(),
}));

vi.mock("@/lib/analytics/log-user-event-server", () => ({
  logUserEventServer: vi.fn(),
}));

vi.mock("@/lib/b2b/flags", async () => {
  const actual = await vi.importActual<typeof import("@/lib/b2b/flags")>(
    "@/lib/b2b/flags",
  );
  return {
    ...actual,
    isDirtywineInquiryMode: vi.fn(() => true),
  };
});

vi.mock("@/lib/b2b/inquiry-prefill", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/b2b/inquiry-prefill")
  >("@/lib/b2b/inquiry-prefill");
  return {
    ...actual,
    loadB2bInquiryPrefill: vi.fn(),
  };
});

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { assertInquiryLinesInB2bStock } from "@/lib/b2b/inquiry-stock";
import { applyServerInquiryLinePrices } from "@/lib/b2b/inquiry-pricing";
import {
  sendB2bInquiryCustomerEmail,
  sendB2bInquiryInternalNotify,
} from "@/lib/b2b/inquiry-emails";
import { loadB2bInquiryPrefill } from "@/lib/b2b/inquiry-prefill";
import { b2bInquiryLimiter } from "@/lib/rate-limiter";
import { POST } from "@/app/api/b2b/inquiry/route";

const validBody = {
  companyName: "Test AB",
  organizationNumber: "556677-8899",
  contactName: "Ada Lovelace",
  email: "ada+inquiry-test@example.com",
  phone: "0701234567",
  deliveryAddress: "Kungsgatan 1",
  postalCode: "11143",
  city: "Stockholm",
  desiredDeliveryDate: "2026-12-15",
  message: "Test inquiry",
  website: "",
  locale: "sv",
  lines: [
    {
      wineId: "11111111-1111-1111-1111-111111111111",
      wineTitle: "Testvin",
      quantity: 6,
      // Client may send B2C/1.25 — server must overwrite to B2B 13200
      unitPriceCents: 12600,
    },
  ],
};

function makeSb() {
  const inquiryInsert = vi.fn().mockReturnValue({
    select: () => ({
      single: async () => ({
        data: { id: "inq-test-id" },
        error: null,
      }),
    }),
  });
  const linesInsert = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn().mockReturnValue({
    eq: async () => ({ error: null }),
  });
  return {
    from: vi.fn((table: string) => {
      if (table === "b2b_inquiries") {
        return { insert: inquiryInsert, delete: del };
      }
      if (table === "b2b_inquiry_lines") {
        return { insert: linesInsert };
      }
      return { insert: vi.fn() };
    }),
    _inquiryInsert: inquiryInsert,
    _linesInsert: linesInsert,
  };
}

describe("POST /api/b2b/inquiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Isolate from shared in-memory limiter across tests in this file.
    (
      b2bInquiryLimiter as unknown as { requests: Map<string, unknown> }
    ).requests.clear();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-test-id",
      email: "ada@example.com",
    } as never);
    vi.mocked(loadB2bInquiryPrefill).mockResolvedValue({
      companyName: "",
      organizationNumber: "",
      contactName: "",
      email: "ada@example.com",
      phone: "",
      deliveryAddress: "",
      postalCode: "",
      city: "",
    });
    vi.mocked(assertInquiryLinesInB2bStock).mockResolvedValue({ ok: true });
    vi.mocked(sendB2bInquiryCustomerEmail).mockResolvedValue(undefined);
    vi.mocked(sendB2bInquiryInternalNotify).mockResolvedValue(undefined);
  });

  it("allows guests without a session and returns claimToken", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const sb = makeSb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(
      new Request("http://localhost/api/b2b/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.id).toBe("inq-test-id");
    expect(typeof json.claimToken).toBe("string");
    expect(json.claimToken.length).toBeGreaterThan(10);
    expect(sb._inquiryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: null,
        claim_token_hash: expect.any(String),
        email: "ada+inquiry-test@example.com",
      }),
    );
    expect(sendB2bInquiryCustomerEmail).toHaveBeenCalled();
  });

  it("persists inquiry for logged-in user without claimToken", async () => {
    const sb = makeSb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(
      new Request("http://localhost/api/b2b/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.id).toBe("inq-test-id");
    expect(json.claimToken).toBeUndefined();
    expect(applyServerInquiryLinePrices).toHaveBeenCalled();
    expect(sb._inquiryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-test-id",
        claim_token_hash: null,
      }),
    );
    expect(sb._linesInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        wine_id: validBody.lines[0].wineId,
        quantity: 6,
        unit_price_cents: 13200,
      }),
    ]);
    expect(sendB2bInquiryCustomerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ada+inquiry-test@example.com",
        value: expect.objectContaining({
          companyName: "Test AB",
          email: "ada+inquiry-test@example.com",
          lines: [
            expect.objectContaining({
              unitPriceCents: 13200,
              quantity: 6,
            }),
          ],
        }),
      }),
    );
    expect(sendB2bInquiryInternalNotify).toHaveBeenCalled();
  });

  it("returns 409 when stock is short", async () => {
    const sb = makeSb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);
    vi.mocked(assertInquiryLinesInB2bStock).mockResolvedValue({
      ok: false,
      shortfalls: [
        {
          wineId: validBody.lines[0].wineId,
          available: 0,
          requested: 6,
        },
      ],
    });

    const res = await POST(
      new Request("http://localhost/api/b2b/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("stock_unavailable");
  });

  it("silently accepts honeypot spam", async () => {
    const res = await POST(
      new Request("http://localhost/api/b2b/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validBody, website: "http://bot" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("returns Swedish validation code for missing fields", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/b2b/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validBody, companyName: "" }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("required");
  });

  it("falls back to profile values for authenticated users with empty fields", async () => {
    const sb = makeSb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);
    vi.mocked(loadB2bInquiryPrefill).mockResolvedValue({
      companyName: "Profile AB",
      organizationNumber: "556677-8899",
      contactName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "0701234567",
      deliveryAddress: "Kungsgatan 1",
      postalCode: "11143",
      city: "Stockholm",
    });

    const res = await POST(
      new Request("http://localhost/api/b2b/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validBody,
          companyName: "",
          organizationNumber: "",
          contactName: "",
          email: "",
          deliveryAddress: "",
          postalCode: "",
          city: "",
        }),
      }),
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(loadB2bInquiryPrefill).toHaveBeenCalled();
    expect(sb._inquiryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: "Profile AB",
        email: "ada@example.com",
        city: "Stockholm",
        user_id: "user-test-id",
      }),
    );
  });

  it("still requires fields missing from both body and profile", async () => {
    const sb = makeSb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);
    vi.mocked(loadB2bInquiryPrefill).mockResolvedValue({
      companyName: "",
      organizationNumber: "556677-8899",
      contactName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "",
      deliveryAddress: "Kungsgatan 1",
      postalCode: "11143",
      city: "Stockholm",
    });

    const res = await POST(
      new Request("http://localhost/api/b2b/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validBody,
          companyName: "",
        }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("required");
  });
});
