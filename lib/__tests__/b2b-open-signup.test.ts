import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  B2B_OPEN_SIGNUP_COPY,
  B2B_OPEN_SIGNUP_PATH,
  b2bOpenSignupCopy,
  b2bOpenSignupHref,
  isDirtywineOpenSignupRequest,
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

  it("exposes Swedish open sign-up copy", () => {
    expect(B2B_OPEN_SIGNUP_COPY.sv.heading).toBe("Skapa konto");
    expect(B2B_OPEN_SIGNUP_COPY.sv.body).toBe(
      "Spara dina förfrågningar och fakturor på ett ställe.",
    );
    expect(b2bOpenSignupCopy("sv").cta).toBe("Skapa konto");
  });

  it("sanitizes next to same-origin relative paths only", () => {
    expect(sanitizeOpenSignupNext("/b2b/inquiry")).toBe("/b2b/inquiry");
    expect(sanitizeOpenSignupNext("/b2b/inquiry?guest=1")).toBe(
      "/b2b/inquiry?guest=1",
    );
    expect(sanitizeOpenSignupNext("//evil.com")).toBeNull();
    expect(sanitizeOpenSignupNext("https://evil.com")).toBeNull();
    expect(sanitizeOpenSignupNext("profile")).toBeNull();
  });

  it("allows open signup only on Dirty Wine hosts", () => {
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

    expect(
      isDirtywineOpenSignupRequest(
        new Request("http://localhost:3000/api/auth/b2b-open-signup", {
          headers: {
            host: "localhost:3000",
            referer: "http://localhost:3000/signup?b2b=1",
          },
        }),
      ),
    ).toBe(true);
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

  it("open signup next can return to inquiry for prefill after auth", () => {
    expect(b2bOpenSignupHref(B2B_INQUIRY_PATH)).toContain(
      "next=%2Fb2b%2Finquiry",
    );
  });
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/analytics/log-user-event-server", () => ({
  logUserEventServer: vi.fn(),
}));

vi.mock("@/lib/auth/finalize-signup", () => ({
  finalizeSignupAfterAuth: vi.fn(async () => ({ ok: true })),
  signupCookiesFromRequest: vi.fn(() => ({
    visitorId: null,
    firstTouchCookie: null,
    countryCode: null,
    cartSessionId: null,
  })),
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
    const json = await res.json();
    expect(json.error).toBe("open_signup_not_available");
  });

  it("creates a business-portal account on dirtywine.se without invite", async () => {
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
    const userId = "11111111-1111-1111-1111-111111111111";
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: userId, email: "ada@example.com" } },
      error: null,
    });
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "access",
          refresh_token: "refresh",
        },
      },
      error: null,
    });

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: { createUser },
        signInWithPassword,
      },
      from: (table: string) => {
        expect(table).toBe("profiles");
        return { upsert };
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
          password: "secret12",
          full_name: "Ada Restaurant",
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.autoSignedIn).toBe(true);
    expect(json.session.access_token).toBe("access");
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        email_confirm: true,
      }),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
        email: "ada@example.com",
        full_name: "Ada Restaurant",
        portal_access: ["business"],
        access_granted_at: expect.any(String),
      }),
      { onConflict: "id" },
    );
  });
});
