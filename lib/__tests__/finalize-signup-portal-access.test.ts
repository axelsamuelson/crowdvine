import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/analytics/log-user-event-server", () => ({
  logUserEventServer: vi.fn(),
}));

vi.mock("@/lib/cart/reconcile-on-auth", () => ({
  reconcileSessionCartForUser: vi.fn(),
}));

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { finalizeSignupAfterAuth } from "@/lib/auth/finalize-signup";

describe("finalizeSignupAfterAuth portal_access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockProfile(existing: {
    portal_access?: string[] | null;
  } | null) {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: existing ? { id: "user-1", ...existing } : null,
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle }),
        }),
        upsert,
      }),
    } as never);
    return { upsert };
  }

  it("sets portal_access to business only when empty on first confirmation", async () => {
    const { upsert } = mockProfile({ portal_access: null });
    const result = await finalizeSignupAfterAuth({
      userId: "user-1",
      email: "new@example.com",
      source: "magic_link",
      emitSignupCompleted: false,
    });
    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      {
        id: "user-1",
        email: "new@example.com",
        portal_access: ["business"],
      },
      { onConflict: "id" },
    );
    const row = upsert.mock.calls[0][0];
    expect(row.role).toBeUndefined();
    expect(row.roles).toBeUndefined();
  });

  it("sets business when portal_access is an empty array", async () => {
    const { upsert } = mockProfile({ portal_access: [] });
    await finalizeSignupAfterAuth({
      userId: "user-1",
      email: "new@example.com",
      source: "dirtywine_open_signup",
      emitSignupCompleted: false,
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ portal_access: ["business"] }),
      { onConflict: "id" },
    );
  });

  it("never overwrites existing portal_access (PACT or business)", async () => {
    const { upsert } = mockProfile({ portal_access: ["user"] });
    await finalizeSignupAfterAuth({
      userId: "user-1",
      email: "member@example.com",
      source: "dirtywine_open_signup",
      emitSignupCompleted: false,
    });
    expect(upsert).toHaveBeenCalledWith(
      { id: "user-1", email: "member@example.com" },
      { onConflict: "id" },
    );
    expect(upsert.mock.calls[0][0].portal_access).toBeUndefined();
    expect(upsert.mock.calls[0][0].role).toBeUndefined();
    expect(upsert.mock.calls[0][0].roles).toBeUndefined();
  });

  it("does not change role/roles even when filling empty portal_access", async () => {
    const { upsert } = mockProfile(null);
    await finalizeSignupAfterAuth({
      userId: "user-1",
      email: "x@example.com",
      source: "magic_link",
      emitSignupCompleted: false,
    });
    const row = upsert.mock.calls[0][0];
    expect(row.portal_access).toEqual(["business"]);
    expect(row).not.toHaveProperty("role");
    expect(row).not.toHaveProperty("roles");
  });
});
