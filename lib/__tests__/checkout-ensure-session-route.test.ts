import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  CHECKOUT_GUEST_PROOF_COOKIE,
  mintGuestSessionProofToken,
} from "@/lib/checkout/guest-session-proof";

const getCurrentUser = vi.fn();
const getSupabaseAdmin = vi.fn();
const createEphemeralAuthClient = vi.fn();
const isPlatformOpen = vi.fn(() => true);
const finalizeSignupAfterAuth = vi.fn();
const existingCheckoutEmailTaken = vi.fn();
const signupLimiter = {
  isAllowed: vi.fn(() => true),
  getResetTime: vi.fn(() => Date.now() + 60_000),
};

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: (...args: unknown[]) => getSupabaseAdmin(...args),
  createEphemeralAuthClient: (...args: unknown[]) =>
    createEphemeralAuthClient(...args),
}));

vi.mock("@/lib/platform-open", () => ({
  isPlatformOpen: (...args: unknown[]) => isPlatformOpen(...args),
}));

vi.mock("@/lib/auth/finalize-signup", () => ({
  finalizeSignupAfterAuth: (...args: unknown[]) =>
    finalizeSignupAfterAuth(...args),
  signupCookiesFromRequest: () => ({
    visitorId: null,
    firstTouchCookie: null,
    countryCode: null,
    cartSessionId: null,
  }),
}));

vi.mock("@/lib/checkout/ensure-session-existing-user", () => ({
  existingCheckoutEmailTaken: (...args: unknown[]) =>
    existingCheckoutEmailTaken(...args),
}));

vi.mock("@/lib/rate-limiter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limiter")>(
    "@/lib/rate-limiter",
  );
  return {
    ...actual,
    signupLimiter,
    getClientIdentifier: () => "test-client",
  };
});

function makeRequest(email: string, cookieHeader?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookieHeader) headers.cookie = cookieHeader;
  return new NextRequest("http://localhost/api/checkout/ensure-session", {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  });
}

describe("POST /api/checkout/ensure-session", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.CHECKOUT_GUEST_PROOF_SECRET = "test-guest-proof-secret";
    isPlatformOpen.mockReturnValue(true);
    getCurrentUser.mockResolvedValue(null);
    signupLimiter.isAllowed.mockReturnValue(true);
    finalizeSignupAfterAuth.mockResolvedValue({ ok: true });
  });

  it("existing email → 409 requiresLogin, no token, no generateLink, no profile write", async () => {
    existingCheckoutEmailTaken.mockResolvedValue(true);
    const generateLink = vi.fn();
    const verifyOtp = vi.fn();
    const from = vi.fn();
    getSupabaseAdmin.mockReturnValue({
      auth: { admin: { generateLink }, verifyOtp },
      from,
    });
    createEphemeralAuthClient.mockReturnValue({
      auth: { verifyOtp: vi.fn() },
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("Existing@Example.com"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.requiresLogin).toBe(true);
    expect(body.error).toMatch(/Logga in/);
    expect(body.session).toBeUndefined();
    expect(body.access_token).toBeUndefined();
    expect(generateLink).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(createEphemeralAuthClient).not.toHaveBeenCalled();
    expect(existingCheckoutEmailTaken).toHaveBeenCalledWith(
      expect.anything(),
      "existing@example.com",
    );
  });

  it("admin email → requiresLogin and never touches profiles (role safe)", async () => {
    existingCheckoutEmailTaken.mockResolvedValue(true);
    const generateLink = vi.fn();
    const profilesUpsert = vi.fn();
    const profilesInsert = vi.fn();
    const from = vi.fn(() => ({
      upsert: profilesUpsert,
      insert: profilesInsert,
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "admin-1", role: "admin" },
            error: null,
          }),
        }),
      }),
    }));
    getSupabaseAdmin.mockReturnValue({
      auth: { admin: { generateLink }, verifyOtp: vi.fn() },
      from,
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("admin@pactwines.com"));
    expect(res.status).toBe(409);
    expect(generateLink).not.toHaveBeenCalled();
    expect(profilesUpsert).not.toHaveBeenCalled();
    expect(profilesInsert).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("new email → creates session and inserts profile with role user only", async () => {
    existingCheckoutEmailTaken.mockResolvedValue(false);
    const generateLink = vi.fn().mockResolvedValue({
      data: {
        user: { id: "new-user-1" },
        properties: {
          hashed_token: "hash-token",
          verification_type: "signup",
        },
      },
      error: null,
    });
    const adminVerifyOtp = vi.fn();
    const ephemeralVerifyOtp = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "access-xyz",
          refresh_token: "refresh-xyz",
        },
      },
      error: null,
    });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle }),
          }),
          insert,
          upsert: vi.fn(),
        };
      }
      return { insert: vi.fn(), upsert: vi.fn() };
    });
    getSupabaseAdmin.mockReturnValue({
      auth: { admin: { generateLink }, verifyOtp: adminVerifyOtp },
      from,
    });
    createEphemeralAuthClient.mockReturnValue({
      auth: { verifyOtp: ephemeralVerifyOtp },
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("brand.new@example.com"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.autoSignedIn).toBe(true);
    expect(body.session).toEqual({
      access_token: "access-xyz",
      refresh_token: "refresh-xyz",
    });
    expect(generateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "brand.new@example.com",
    });
    expect(adminVerifyOtp).not.toHaveBeenCalled();
    expect(createEphemeralAuthClient).toHaveBeenCalled();
    expect(ephemeralVerifyOtp).toHaveBeenCalledWith({
      token_hash: "hash-token",
      type: "email",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "new-user-1",
        email: "brand.new@example.com",
        role: "user",
      }),
    );
    // Profile insert must happen before verifyOtp (admin still privileged).
    expect(insert.mock.invocationCallOrder[0]).toBeLessThan(
      ephemeralVerifyOtp.mock.invocationCallOrder[0],
    );
    expect(finalizeSignupAfterAuth).toHaveBeenCalled();
  });

  it("never calls verifyOtp on the admin client used for profiles (RLS session pollution)", async () => {
    existingCheckoutEmailTaken.mockResolvedValue(false);
    const generateLink = vi.fn().mockResolvedValue({
      data: {
        user: { id: "iso-user" },
        properties: {
          hashed_token: "tok",
          verification_type: "signup",
        },
      },
      error: null,
    });
    const adminClient = {
      auth: { admin: { generateLink }, verifyOtp: vi.fn() },
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
    const ephemeralVerifyOtp = vi.fn().mockResolvedValue({
      data: {
        session: { access_token: "a", refresh_token: "r" },
      },
      error: null,
    });
    getSupabaseAdmin.mockReturnValue(adminClient);
    createEphemeralAuthClient.mockReturnValue({
      auth: { verifyOtp: ephemeralVerifyOtp },
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("iso@example.com"));
    expect(res.status).toBe(200);
    expect(adminClient.auth.verifyOtp).not.toHaveBeenCalled();
    expect(ephemeralVerifyOtp).toHaveBeenCalledTimes(1);
    expect(createEphemeralAuthClient).toHaveBeenCalledTimes(1);
  });

  it("refuses session when generateLink is magiclink (not signup) even if existence check missed", async () => {
    existingCheckoutEmailTaken.mockResolvedValue(false);
    const generateLink = vi.fn().mockResolvedValue({
      data: {
        user: { id: "existing-1" },
        properties: {
          hashed_token: "hash-token",
          verification_type: "magiclink",
        },
      },
      error: null,
    });
    const from = vi.fn();
    getSupabaseAdmin.mockReturnValue({
      auth: { admin: { generateLink }, verifyOtp: vi.fn() },
      from,
    });
    createEphemeralAuthClient.mockReturnValue({
      auth: { verifyOtp: vi.fn() },
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("sneaky@example.com"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.requiresLogin).toBe(true);
    expect(from).not.toHaveBeenCalled();
    expect(createEphemeralAuthClient).not.toHaveBeenCalled();
  });

  it("does not overwrite an existing profile row (insert skipped when profile exists)", async () => {
    existingCheckoutEmailTaken.mockResolvedValue(false);
    const generateLink = vi.fn().mockResolvedValue({
      data: {
        user: { id: "race-user" },
        properties: {
          hashed_token: "hash-token",
          verification_type: "signup",
        },
      },
      error: null,
    });
    const insert = vi.fn();
    const upsert = vi.fn();
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "race-user" },
            error: null,
          }),
        }),
      }),
      insert,
      upsert,
    }));
    getSupabaseAdmin.mockReturnValue({
      auth: { admin: { generateLink }, verifyOtp: vi.fn() },
      from,
    });
    createEphemeralAuthClient.mockReturnValue({
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({
          data: {
            session: { access_token: "a", refresh_token: "r" },
          },
          error: null,
        }),
      },
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("race@example.com"));
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns Swedish errors for profile failures", async () => {
    existingCheckoutEmailTaken.mockResolvedValue(false);
    const generateLink = vi.fn().mockResolvedValue({
      data: {
        user: { id: "fail-user" },
        properties: {
          hashed_token: "hash-token",
          verification_type: "signup",
        },
      },
      error: null,
    });
    getSupabaseAdmin.mockReturnValue({
      auth: { admin: { generateLink }, verifyOtp: vi.fn() },
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: null,
              error: { message: "permission denied for table profiles", code: "42501" },
            }),
          }),
        }),
        insert: vi.fn(),
      })),
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("fail@example.com"));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("Kunde inte förbereda profilen. Försök igen.");
    expect(createEphemeralAuthClient).not.toHaveBeenCalled();
  });

  it("returns 403 when platform is closed", async () => {
    isPlatformOpen.mockReturnValue(false);
    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("x@example.com"));
    expect(res.status).toBe(403);
    expect(existingCheckoutEmailTaken).not.toHaveBeenCalled();
  });

  it("existing email + valid guest proof remints session (reload same browser)", async () => {
    existingCheckoutEmailTaken.mockResolvedValue(true);
    const proof = mintGuestSessionProofToken(
      "reload@example.com",
      "guest-uid-1",
    );
    const generateLink = vi.fn().mockResolvedValue({
      data: {
        user: { id: "guest-uid-1" },
        properties: {
          hashed_token: "remint-hash",
          verification_type: "magiclink",
        },
      },
      error: null,
    });
    const insert = vi.fn();
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "guest-uid-1", role: "user" },
            error: null,
          }),
        }),
      }),
      insert,
    }));
    const ephemeralVerifyOtp = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "access-remint",
          refresh_token: "refresh-remint",
        },
      },
      error: null,
    });
    getSupabaseAdmin.mockReturnValue({
      auth: { admin: { generateLink }, verifyOtp: vi.fn() },
      from,
    });
    createEphemeralAuthClient.mockReturnValue({
      auth: { verifyOtp: ephemeralVerifyOtp },
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(
      makeRequest(
        "reload@example.com",
        `${CHECKOUT_GUEST_PROOF_COOKIE}=${proof}`,
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.autoSignedIn).toBe(true);
    expect(body.reminted).toBe(true);
    expect(body.session.access_token).toBe("access-remint");
    expect(insert).not.toHaveBeenCalled();
    expect(generateLink).toHaveBeenCalled();
    expect(ephemeralVerifyOtp).toHaveBeenCalled();
    // Proof cookie refreshed on response
    const setCookie = res.headers.getSetCookie?.() ?? [];
    expect(
      setCookie.some((c) => c.startsWith(`${CHECKOUT_GUEST_PROOF_COOKIE}=`)),
    ).toBe(true);
  });

  it("existing email + proof for other email still 409 (no takeover)", async () => {
    existingCheckoutEmailTaken.mockResolvedValue(true);
    const proof = mintGuestSessionProofToken("mine@example.com", "uid-mine");
    const generateLink = vi.fn();
    getSupabaseAdmin.mockReturnValue({
      auth: { admin: { generateLink }, verifyOtp: vi.fn() },
      from: vi.fn(),
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(
      makeRequest(
        "victim@example.com",
        `${CHECKOUT_GUEST_PROOF_COOKIE}=${proof}`,
      ),
    );
    expect(res.status).toBe(409);
    expect(generateLink).not.toHaveBeenCalled();
  });
});
