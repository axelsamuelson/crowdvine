import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const reconcileSessionCartForUser = vi.fn();
const getCart = vi.fn();
const cookiesGet = vi.fn();
const cookiesSet = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("@/lib/cart/reconcile-on-auth", () => ({
  reconcileSessionCartForUser: (...args: unknown[]) =>
    reconcileSessionCartForUser(...args),
  bindCartOwnerAndTouch: vi.fn(),
}));

vi.mock("@/src/lib/cart-service", () => ({
  CartService: {
    getCart: () => getCart(),
  },
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
          neq: () => ({ data: [] }),
        }),
      }),
    }),
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookiesGet(name),
    set: (...args: unknown[]) => cookiesSet(...args),
  }),
}));

describe("POST /api/cart/merge", () => {
  beforeEach(() => {
    vi.resetModules();
    getCurrentUser.mockReset();
    reconcileSessionCartForUser.mockReset();
    getCart.mockReset();
    cookiesGet.mockReset();
    cookiesSet.mockReset();
    cookiesGet.mockReturnValue(undefined);
  });

  it("returns 200 { merged: false } for guests (no session) without reconciling", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { POST } = await import("@/app/api/cart/merge/route");
    const res = await POST(
      new Request("http://localhost/api/cart/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: "auto" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, merged: false });
    expect(reconcileSessionCartForUser).not.toHaveBeenCalled();
    expect(getCart).not.toHaveBeenCalled();
  });

  it("still enters merge logic for anonymous auth users (same as pre-PR)", async () => {
    getCurrentUser.mockResolvedValue({
      id: "anon-1",
      is_anonymous: true,
    });
    cookiesGet.mockImplementation((name: string) =>
      name === "cv_cart_id" ? { value: "session-anon" } : undefined,
    );
    reconcileSessionCartForUser.mockResolvedValue({
      sessionId: "session-anon",
      cartId: "cart-anon",
      mergedFromCartIds: [],
    });
    getCart.mockResolvedValue({
      id: "cart-anon",
      totalQuantity: 6,
      lines: [{ id: "line-1", quantity: 6 }],
    });

    const { POST } = await import("@/app/api/cart/merge/route");
    const res = await POST(
      new Request("http://localhost/api/cart/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: "auto" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.merged).toBe(true);
    expect(reconcileSessionCartForUser).toHaveBeenCalledWith({
      userId: "anon-1",
      sessionId: "session-anon",
    });
    expect(getCart).toHaveBeenCalled();
  });

  it("merges for logged-in users even when client has no JS-visible sb- cookies", async () => {
    // Simulates server reading httpOnly auth cookies via getCurrentUser —
    // document.cookie on the client would be empty of sb-*-auth-token.
    getCurrentUser.mockResolvedValue({ id: "user-1", email: "u@example.com" });
    cookiesGet.mockImplementation((name: string) =>
      name === "cv_cart_id" ? { value: "session-abc" } : undefined,
    );
    reconcileSessionCartForUser.mockResolvedValue({
      sessionId: "session-abc",
      cartId: "cart-1",
      mergedFromCartIds: ["cart-old"],
    });
    getCart.mockResolvedValue({
      id: "cart-1",
      totalQuantity: 6,
      lines: [{ id: "line-1", quantity: 6 }],
    });

    const { POST } = await import("@/app/api/cart/merge/route");
    const res = await POST(
      new Request("http://localhost/api/cart/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: "auto" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.merged).toBe(true);
    expect(body.mergedFromCartIds).toEqual(["cart-old"]);
    expect(body.cart.totalQuantity).toBe(6);
    expect(reconcileSessionCartForUser).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: "session-abc",
    });
  });
});
