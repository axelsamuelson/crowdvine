import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authUsersEmailFilterFetch,
  escapeIlikeExact,
  existingCheckoutEmailTaken,
} from "@/lib/checkout/ensure-session-existing-user";

describe("escapeIlikeExact", () => {
  it("escapes ilike wildcards so the match is exact", () => {
    expect(escapeIlikeExact("a_b%c\\d")).toBe("a\\_b\\%c\\\\d");
  });
});

describe("authUsersEmailFilterFetch", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("returns exists on exact case-insensitive email match", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [{ email: "Ada@Example.com" }],
      }),
    });
    await expect(
      authUsersEmailFilterFetch("ada@example.com", fetchImpl as typeof fetch),
    ).resolves.toBe("exists");
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("email=ada%40example.com"),
      expect.any(Object),
    );
  });

  it("returns absent when GoTrue returns an empty user list", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ users: [] }),
    });
    await expect(
      authUsersEmailFilterFetch("new@example.com", fetchImpl as typeof fetch),
    ).resolves.toBe("absent");
  });
});

describe("existingCheckoutEmailTaken", () => {
  it("returns true when profiles owns the email (no auth calls needed)", async () => {
    const listUsers = vi.fn();
    const fetchImpl = vi.fn();
    const sb = {
      from: () => ({
        select: () => ({
          ilike: () => ({
            limit: () => ({
              maybeSingle: async () => ({
                data: { id: "u1" },
                error: null,
              }),
            }),
          }),
        }),
      }),
      auth: { admin: { listUsers } },
    };
    await expect(
      existingCheckoutEmailTaken(sb, "user@example.com", fetchImpl as typeof fetch),
    ).resolves.toBe(true);
    expect(listUsers).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns false for a brand-new email after auth filter says absent", async () => {
    const listUsers = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ users: [] }),
    });
    const sb = {
      from: () => ({
        select: () => ({
          ilike: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
      auth: { admin: { listUsers } },
    };
    await expect(
      existingCheckoutEmailTaken(sb, "new@example.com", fetchImpl as typeof fetch),
    ).resolves.toBe(false);
    expect(listUsers).not.toHaveBeenCalled();
  });

  it("falls back to listUsers scan and matches exact CI email", async () => {
    const listUsers = vi.fn().mockResolvedValue({
      data: {
        users: [
          { email: "other@example.com" },
          { email: "Admin@Example.com" },
        ],
      },
      error: null,
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [{ email: "unrelated@example.com" }],
      }),
    });
    const sb = {
      from: () => ({
        select: () => ({
          ilike: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
      auth: { admin: { listUsers } },
    };
    await expect(
      existingCheckoutEmailTaken(
        sb,
        "admin@example.com",
        fetchImpl as typeof fetch,
      ),
    ).resolves.toBe(true);
    expect(listUsers).toHaveBeenCalled();
  });

  it("fails closed when profile lookup errors", async () => {
    const sb = {
      from: () => ({
        select: () => ({
          ilike: () => ({
            limit: () => ({
              maybeSingle: async () => ({
                data: null,
                error: { message: "db down" },
              }),
            }),
          }),
        }),
      }),
      auth: { admin: { listUsers: vi.fn() } },
    };
    await expect(
      existingCheckoutEmailTaken(sb, "x@example.com", vi.fn() as typeof fetch),
    ).resolves.toBe(true);
  });
});
