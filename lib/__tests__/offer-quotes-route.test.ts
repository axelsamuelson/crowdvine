import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/src/lib/cart-service", () => ({
  CartService: {
    getCart: async () => null,
  },
}));

describe("POST /api/checkout/offer-quotes", () => {
  beforeEach(() => {
    vi.resetModules();
    getCurrentUser.mockReset();
    vi.stubEnv("CHECKOUT_DUAL_OFFER_COMPARE", "");
  });

  async function post(body: unknown = {}) {
    const { POST } = await import("@/app/api/checkout/offer-quotes/route");
    return POST(
      new Request("http://localhost/api/checkout/offer-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("returns 404 when CHECKOUT_DUAL_OFFER_COMPARE is OFF", async () => {
    vi.stubEnv("CHECKOUT_DUAL_OFFER_COMPARE", "");
    getCurrentUser.mockResolvedValue({ id: "user-1" });
    const res = await post({ pallet_id: "p1" });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("dual_offer_compare_disabled");
  });

  it("returns 401 when flag ON but unauthenticated", async () => {
    vi.stubEnv("CHECKOUT_DUAL_OFFER_COMPARE", "true");
    getCurrentUser.mockResolvedValue(null);
    const res = await post({ pallet_id: "p1" });
    expect(res.status).toBe(401);
  });
});
