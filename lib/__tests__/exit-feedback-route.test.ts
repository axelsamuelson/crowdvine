import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: (...args: unknown[]) => insert(...args),
    }),
  }),
}));

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: async () => null,
}));

describe("POST /api/exit-feedback", () => {
  beforeEach(() => {
    vi.resetModules();
    insert.mockReset();
    insert.mockResolvedValue({ error: null });
  });

  async function post(body: unknown) {
    const { POST } = await import("@/app/api/exit-feedback/route");
    return POST(
      new Request("http://localhost/api/exit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("rejects oversized answers", async () => {
    const res = await post({
      step: "cart",
      page: "/vin",
      reason: "other",
      answer: "x".repeat(1001),
    });
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects invalid step", async () => {
    const res = await post({
      step: "home",
      page: "/",
      reason: "price",
    });
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects invalid reason", async () => {
    const res = await post({
      step: "cart",
      page: "/",
      reason: "too_expensive",
    });
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts reason without answer and without session_id", async () => {
    const res = await post({
      step: "checkout",
      page: "/checkout?email=secret@example.com",
      reason: "price",
      is_internal: true,
      // Legacy clients may still send these — must not be stored.
      session_id: "session_abcdefgh",
      visitor_id: "visitor_xyz",
      user_id: "user_abc",
    });
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row).toEqual({
      step: "checkout",
      page: "/checkout",
      reason: "price",
      answer: null,
      is_internal: true,
    });
    expect(row).not.toHaveProperty("session_id");
    expect(row).not.toHaveProperty("visitor_id");
    expect(row).not.toHaveProperty("user_id");
    expect(row).not.toHaveProperty("ip");
    expect(row).not.toHaveProperty("email");
  });

  it("stores optional free text for other", async () => {
    const res = await post({
      step: "cart",
      page: "/vin",
      reason: "other",
      answer: "  Behövde tänka  ",
    });
    expect(res.status).toBe(200);
    const row = insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row).toMatchObject({
      reason: "other",
      answer: "Behövde tänka",
    });
    expect(row).not.toHaveProperty("session_id");
  });
});
