import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: (...args: unknown[]) => insert(...args),
    }),
  }),
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
      session_id: "session_abcdefgh",
      step: "cart",
      page: "/vin",
      answer: "x".repeat(1001),
    });
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects invalid step", async () => {
    const res = await post({
      session_id: "session_abcdefgh",
      step: "home",
      page: "/",
      answer: "för dyrt",
    });
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts sanitized payload without IP fields", async () => {
    const res = await post({
      session_id: "session_abcdefgh",
      step: "checkout",
      page: "/checkout?email=secret@example.com",
      answer: "  Behövde tänka  ",
      is_internal: true,
    });
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row).toEqual({
      session_id: "session_abcdefgh",
      step: "checkout",
      page: "/checkout",
      answer: "Behövde tänka",
      is_internal: true,
    });
    expect(row).not.toHaveProperty("ip");
    expect(row).not.toHaveProperty("ip_address");
    expect(row).not.toHaveProperty("user_id");
    expect(row).not.toHaveProperty("email");
  });
});
