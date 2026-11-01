import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  B2B_OPEN_SIGNUP_COPY,
  B2B_OPEN_SIGNUP_MIN_PASSWORD,
  B2B_OPEN_SIGNUP_PATH,
  B2B_OPEN_SIGNUP_SOURCE,
  b2bOpenSignupCopy,
  b2bOpenSignupHref,
  isDirtywineOpenSignupRequest,
  isExactDirtywineOpenSignupHost,
  sanitizeOpenSignupNext,
} from "@/lib/b2b/open-signup";
import {
  B2B_INQUIRY_GUEST_PATH,
  B2B_INQUIRY_PATH,
  b2bInquiryLoginHref,
  isB2bInquiryGuestMode,
} from "@/lib/b2b/inquiry-login";

describe("Dirty Wine open sign-up helpers", () => {
  it("keeps the existing /signup URL slug", () => {
    expect(B2B_OPEN_SIGNUP_PATH).toBe("/signup");
    expect(b2bOpenSignupHref()).toBe("/signup");
    expect(b2bOpenSignupHref("/b2b/inquiry")).toBe(
      `/signup?next=${encodeURIComponent("/b2b/inquiry")}`,
    );
  });

  it("exposes Swedish open sign-up + check-email copy", () => {
    expect(B2B_OPEN_SIGNUP_COPY.sv.heading).toBe("Skapa konto");
    expect(B2B_OPEN_SIGNUP_COPY.sv.body).toBe(
      "Spara dina förfrågningar och fakturor på ett ställe.",
    );
    expect(B2B_OPEN_SIGNUP_COPY.sv.checkEmailHeading).toBe("Kolla din mejl");
    expect(b2bOpenSignupCopy("sv").cta).toBe("Skapa konto");
    expect(B2B_OPEN_SIGNUP_MIN_PASSWORD).toBe(8);
    expect(B2B_OPEN_SIGNUP_SOURCE).toBe("dirtywine_open_signup");
  });

  it("sanitizes next to same-origin relative paths only", () => {
    expect(sanitizeOpenSignupNext("/b2b/inquiry")).toBe("/b2b/inquiry");
    expect(sanitizeOpenSignupNext("//evil.com")).toBeNull();
  });

  it("allows only exact Dirty Wine hosts (not substring)", () => {
    expect(isExactDirtywineOpenSignupHost("dirtywine.se")).toBe(true);
    expect(isExactDirtywineOpenSignupHost("www.dirtywine.se")).toBe(true);
    expect(isExactDirtywineOpenSignupHost("evil-dirtywine.se")).toBe(false);
    expect(isExactDirtywineOpenSignupHost("pactwines.com")).toBe(false);
    expect(
      isExactDirtywineOpenSignupHost("localhost", {
        get: (k) => (k === "b2b" ? "1" : null),
      }),
    ).toBe(true);
  });

  it("gates open signup API requests by exact host", () => {
    expect(
      isDirtywineOpenSignupRequest(
        new Request("https://dirtywine.se/api/auth/b2b-open-signup", {
          headers: { host: "dirtywine.se" },
        }),
      ),
    ).toBe(true);
    expect(
      isDirtywineOpenSignupRequest(
        new Request("https://pactwines.com/api/auth/b2b-open-signup", {
          headers: { host: "pactwines.com" },
        }),
      ),
    ).toBe(false);
  });
});

describe("guest inquiry still works alongside open sign-up", () => {
  it("keeps Logga in / Fortsätt som ny kund paths", () => {
    expect(b2bInquiryLoginHref()).toBe(
      `/log-in?next=${encodeURIComponent(B2B_INQUIRY_PATH)}`,
    );
    expect(B2B_INQUIRY_GUEST_PATH).toBe("/b2b/inquiry?guest=1");
    expect(
      isB2bInquiryGuestMode({ get: (k) => (k === "guest" ? "1" : null) }),
    ).toBe(true);
  });
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limiter")>(
    "@/lib/rate-limiter",
  );
  return {
    ...actual,
    signupLimiter: {
      isAllowed: () => true,
      getResetTime: () => Date.now() + 60_000,
    },
  };
});

describe("POST /api/auth/b2b-open-signup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects pactwines.com (invite flow unchanged)", async () => {
    const { POST } = await import("@/app/api/auth/b2b-open-signup/route");
    const res = await POST(
      new NextRequest("https://pactwines.com/api/auth/b2b-open-signup", {
        method: "POST",
        headers: {
          host: "pactwines.com",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "x@example.com",
          password: "secret12",
          full_name: "X",
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const { POST } = await import("@/app/api/auth/b2b-open-signup/route");
    const res = await POST(
      new NextRequest("https://dirtywine.se/api/auth/b2b-open-signup", {
        method: "POST",
        headers: {
          host: "dirtywine.se",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "ada@example.com",
          password: "short",
          full_name: "Ada",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("inserts a new profile with business portal and returns check-email", async () => {
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
    const { createSupabaseServerClient } = await import(
      "@/lib/supabase/server"
    );
    const userId = "11111111-1111-1111-1111-111111111111";
    const insert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: userId, email: "ada@example.com" }, session: null },
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockReturnValue({
      auth: { signUp },
    } as never);

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: (table: string) => {
        expect(table).toBe("profiles");
        return {
          select: () => ({
            eq: () => ({ maybeSingle }),
          }),
          insert,
        };
      },
    } as never);

    const { POST } = await import("@/app/api/auth/b2b-open-signup/route");
    const res = await POST(
      new NextRequest("https://dirtywine.se/api/auth/b2b-open-signup", {
        method: "POST",
        headers: {
          host: "dirtywine.se",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "ada@example.com",
          password: "secret123",
          full_name: "Ada Restaurant",
          next: "/b2b/inquiry",
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.needsEmailConfirmation).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
        portal_access: ["business"],
      }),
    );
    expect(insert.mock.calls[0][0].access_granted_at).toBeUndefined();
  });

  it("does not overwrite an existing profile (role/roles/portal_access)", async () => {
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
    const { createSupabaseServerClient } = await import(
      "@/lib/supabase/server"
    );
    const userId = "22222222-2222-2222-2222-222222222222";
    const insert = vi.fn();
    const upsert = vi.fn();
    const update = vi.fn();
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: userId }, error: null });
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: userId, email: "member@example.com" }, session: null },
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockReturnValue({
      auth: { signUp },
    } as never);

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle }),
        }),
        insert,
        upsert,
        update,
      }),
    } as never);

    const { POST } = await import("@/app/api/auth/b2b-open-signup/route");
    const res = await POST(
      new NextRequest("https://dirtywine.se/api/auth/b2b-open-signup", {
        method: "POST",
        headers: {
          host: "dirtywine.se",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "member@example.com",
          password: "secret123",
          full_name: "Existing Member",
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.needsEmailConfirmation).toBe(true);
    expect(insert).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("returns neutral check-email when signUp says email already registered", async () => {
    const { createSupabaseServerClient } = await import(
      "@/lib/supabase/server"
    );
    const signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });
    vi.mocked(createSupabaseServerClient).mockReturnValue({
      auth: { signUp },
    } as never);

    const { POST } = await import("@/app/api/auth/b2b-open-signup/route");
    const res = await POST(
      new NextRequest("https://dirtywine.se/api/auth/b2b-open-signup", {
        method: "POST",
        headers: {
          host: "dirtywine.se",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "taken@example.com",
          password: "secret123",
          full_name: "Taken",
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.needsEmailConfirmation).toBe(true);
    expect(json.error).toBeUndefined();
    expect(JSON.stringify(json)).not.toMatch(/already|registered|exists/i);
  });

  it("never returns database error text on profile insert failure", async () => {
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
    const { createSupabaseServerClient } = await import(
      "@/lib/supabase/server"
    );
    const userId = "33333333-3333-3333-3333-333333333333";
    const insert = vi.fn().mockResolvedValue({
      error: { message: "duplicate key value violates unique constraint" },
    });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: userId, email: "race@example.com" }, session: null },
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockReturnValue({
      auth: { signUp },
    } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle }) }),
        insert,
      }),
    } as never);

    const { POST } = await import("@/app/api/auth/b2b-open-signup/route");
    const res = await POST(
      new NextRequest("https://dirtywine.se/api/auth/b2b-open-signup", {
        method: "POST",
        headers: {
          host: "dirtywine.se",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "race@example.com",
          password: "secret123",
          full_name: "Race",
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.needsEmailConfirmation).toBe(true);
    expect(JSON.stringify(json)).not.toMatch(/duplicate|constraint|violates/i);
    expect(json.details).toBeUndefined();
  });
});
