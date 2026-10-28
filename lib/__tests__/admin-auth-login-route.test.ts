import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cookieSet = vi.fn();
const signOut = vi.fn();
let profile: { id: string; email: string; role: string; roles: string[] } | null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: cookieSet,
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        set: (name: string, value: string, opts: object) => void;
        remove: (name: string, opts: object) => void;
      };
    },
  ) => ({
    auth: {
      signInWithPassword: async () => {
        options.cookies.set("sb-abrnvjqwpdkodgrtezeg-auth-token", "session", {});
        return {
          data: { user: { id: profile?.id ?? "user-1" } },
          error: null,
        };
      },
      signOut: async () => {
        signOut();
        options.cookies.remove("sb-abrnvjqwpdkodgrtezeg-auth-token", {});
      },
    },
  }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: profile, error: null }),
        }),
      }),
    }),
  }),
}));

describe("POST /api/admin/auth", () => {
  beforeEach(() => {
    cookieSet.mockReset();
    signOut.mockReset();
    profile = null;
  });

  it("signs out and returns 403 when the password is valid but the profile is not admin", async () => {
    profile = {
      id: "user-1",
      email: "user@example.com",
      role: "user",
      roles: ["user"],
    };
    const { POST } = await import("@/app/api/admin/auth/route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/auth", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "secret" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(signOut).toHaveBeenCalledOnce();
    expect(cookieSet).toHaveBeenCalledWith(
      "sb-abrnvjqwpdkodgrtezeg-auth-token",
      "",
      expect.objectContaining({ maxAge: 0 }),
    );
  });

  it("keeps the supabase session cookie for an admin and does not set admin-auth", async () => {
    profile = {
      id: "admin-1",
      email: "admin@example.com",
      role: "admin",
      roles: ["admin"],
    };
    const { POST } = await import("@/app/api/admin/auth/route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/auth", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@example.com",
          password: "secret",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(signOut).not.toHaveBeenCalled();
    expect(cookieSet).toHaveBeenCalledWith(
      "sb-abrnvjqwpdkodgrtezeg-auth-token",
      "session",
      expect.any(Object),
    );
    const names = response.cookies.getAll().map((cookie) => cookie.name);
    expect(names).not.toContain("admin-auth");
    expect(names).not.toContain("admin-email");
  });
});
