import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getCurrentUser = vi.fn();
const maybeSingle = vi.fn();
const single = vi.fn();
const update = vi.fn();
const insert = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
  headers: async () => new Headers(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => maybeSingle(),
            single: () => single(),
          }),
          maybeSingle: () => maybeSingle(),
          single: () => single(),
        }),
      }),
      update: () => {
        update();
        return { eq: async () => ({ error: null }) };
      },
      insert: () => {
        insert();
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

describe("service-role routes require a session", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    maybeSingle.mockReset();
    single.mockReset();
    update.mockReset();
    insert.mockReset();
    delete process.env.DISCOUNT_CODE_WEBHOOK_SECRET;
  });

  it("returns 401 from admin reservations when there is no session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/reservations/route");
    const response = await GET();
    expect(response.status).toBe(401);
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects unknown reservation fields before any update", async () => {
    getCurrentUser.mockResolvedValue({ id: "admin-1", email: "a@example.com" });
    maybeSingle.mockResolvedValue({
      data: {
        id: "admin-1",
        email: "a@example.com",
        role: "admin",
        roles: ["admin"],
      },
      error: null,
    });
    const { PATCH } = await import("@/app/api/admin/reservations/[id]/route");
    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/reservations/res-1", {
        method: "PATCH",
        body: JSON.stringify({
          status: "placed",
          order_id: "",
          notes: "",
          pickup_zone_id: "",
          delivery_zone_id: "",
          address_id: "",
          delivery_address: "",
          pallet_id: "",
          payment_intent_id: "pi_should_not_apply",
        }),
      }),
      { params: Promise.resolve({ id: "res-1" }) },
    );
    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 401 from reservation details without a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/reservation-details/route");
    const response = await GET(
      new Request("http://localhost/api/reservation-details?reservationId=res-1"),
    );
    expect(response.status).toBe(401);
    expect(single).not.toHaveBeenCalled();
  });

  it("returns 404 when the reservation is not owned by the session", async () => {
    getCurrentUser.mockResolvedValue({ id: "customer-1" });
    single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    const { GET } = await import("@/app/api/reservation-details/route");
    const response = await GET(
      new Request(
        "http://localhost/api/reservation-details?reservationId=someone-else",
      ),
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 from payment-failure log for another user's intent and does not write", async () => {
    getCurrentUser.mockResolvedValue({ id: "customer-1" });
    maybeSingle.mockResolvedValue({
      data: { id: "res-other", user_id: "customer-2", payment_attempts: 1 },
      error: null,
    });
    const { POST } = await import("@/app/api/checkout/log-payment-failure/route");
    const response = await POST(
      new Request("http://localhost/api/checkout/log-payment-failure", {
        method: "POST",
        body: JSON.stringify({ setup_intent_id: "seti_other" }),
      }),
    );
    expect(response.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 401 from the discount webhook when the bearer secret is wrong", async () => {
    process.env.DISCOUNT_CODE_WEBHOOK_SECRET = "expected-secret";
    const { POST } = await import(
      "@/app/api/webhooks/discount-code-created/route"
    );
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/discount-code-created", {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
        body: JSON.stringify({ record: { id: "code-1" } }),
      }),
    );
    expect(response.status).toBe(401);
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it("returns 500 from the discount webhook when the secret is not configured", async () => {
    const { POST } = await import(
      "@/app/api/webhooks/discount-code-created/route"
    );
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/discount-code-created", {
        method: "POST",
        headers: { authorization: "Bearer anything" },
        body: JSON.stringify({ record: { id: "code-1" } }),
      }),
    );
    expect(response.status).toBe(500);
    expect(maybeSingle).not.toHaveBeenCalled();
  });
});
