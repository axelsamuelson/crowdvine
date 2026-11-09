import { describe, expect, it, vi, beforeEach } from "vitest";

const updateEq = vi.fn();
const updateIs = vi.fn();
const update = vi.fn(() => ({ eq: updateEq, is: updateIs }));
const maybeSingle = vi.fn();
const selectEq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq: selectEq }));
const from = vi.fn(() => ({ select, update }));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from }),
}));

describe("GET /api/marketing/unsubscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateEq.mockReturnValue({ is: updateIs });
    updateIs.mockResolvedValue({ error: null });
  });

  it("marks withdrawn_at for a valid token (idempotent)", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "c1",
        email: "ok@example.test",
        purpose: "new_pallet_open",
        withdrawn_at: null,
      },
      error: null,
    });

    const { GET } = await import("@/app/api/marketing/unsubscribe/route");
    const res = await GET(
      new Request(
        "http://localhost/api/marketing/unsubscribe?token=abc123tokenlongenough",
      ),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean; already?: boolean };
    expect(json.ok).toBe(true);
    expect(from).toHaveBeenCalledWith("marketing_consents");
    expect(update).toHaveBeenCalled();
  });

  it("returns already when previously withdrawn", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "c1",
        email: "ok@example.test",
        purpose: "new_pallet_open",
        withdrawn_at: "2026-10-01T00:00:00.000Z",
      },
      error: null,
    });

    const { GET } = await import("@/app/api/marketing/unsubscribe/route");
    const res = await GET(
      new Request(
        "http://localhost/api/marketing/unsubscribe?token=abc123tokenlongenough",
      ),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean; already?: boolean };
    expect(json.ok).toBe(true);
    expect(json.already).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("400 without token; 404 unknown token", async () => {
    const { GET } = await import("@/app/api/marketing/unsubscribe/route");
    const missing = await GET(
      new Request("http://localhost/api/marketing/unsubscribe"),
    );
    expect(missing.status).toBe(400);

    maybeSingle.mockResolvedValue({ data: null, error: null });
    const unknown = await GET(
      new Request(
        "http://localhost/api/marketing/unsubscribe?token=unknown-token-16xx",
      ),
    );
    expect(unknown.status).toBe(404);
  });
});
