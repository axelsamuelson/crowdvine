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

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { assertInquiryLinesInB2bStock } from "@/lib/b2b/inquiry-stock";
import {
  sendB2bInquiryCustomerEmail,
  sendB2bInquiryInternalNotify,
} from "@/lib/b2b/inquiry-emails";
import { POST } from "@/app/api/b2b/inquiry/route";

const validBody = {
  companyName: "Test AB",
  organizationNumber: "556677-8899",
  contactName: "Ada Lovelace",
  email: "ada+inquiry-test@example.com",
  phone: "0701234567",
  deliveryAddress: "Kungsgatan 1",
  postalCode: "11143",
  desiredDeliveryDate: "2026-12-15",
  message: "Test inquiry",
  website: "",
  locale: "sv",
  lines: [
    {
      wineId: "11111111-1111-1111-1111-111111111111",
      wineTitle: "Testvin",
      quantity: 6,
      unitPriceCents: 15000,
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
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-test-id",
      email: "ada@example.com",
    } as never);
    vi.mocked(assertInquiryLinesInB2bStock).mockResolvedValue({ ok: true });
    vi.mocked(sendB2bInquiryCustomerEmail).mockResolvedValue(undefined);
    vi.mocked(sendB2bInquiryInternalNotify).mockResolvedValue(undefined);
  });

  it("returns 401 without a session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/b2b/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("unauthorized");
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("persists inquiry, sends emails, returns id", async () => {
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
    expect(sendB2bInquiryCustomerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ada+inquiry-test@example.com",
        value: expect.objectContaining({
          companyName: "Test AB",
          email: "ada+inquiry-test@example.com",
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
});
