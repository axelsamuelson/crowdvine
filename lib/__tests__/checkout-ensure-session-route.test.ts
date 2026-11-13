import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getCurrentUser = vi.fn();
const getSupabaseAdmin = vi.fn();
const isPlatformOpen = vi.fn(() => true);
const isGuestCheckoutEnabled = vi.fn(() => false);
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
}));

vi.mock("@/lib/platform-open", () => ({
  isPlatformOpen: (...args: unknown[]) => isPlatformOpen(...args),
}));

vi.mock("@/lib/checkout/guest-checkout-flag", () => ({
  isGuestCheckoutEnabled: (...args: unknown[]) =>
    isGuestCheckoutEnabled(...args),
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

function makeRequest(
  email: string,
  extras?: { fullName?: string; countryCode?: string },
) {
  return new NextRequest("http://localhost/api/checkout/ensure-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      ...(extras?.fullName ? { fullName: extras.fullName } : {}),
      ...(extras?.countryCode !== undefined
        ? { countryCode: extras.countryCode }
        : {}),
    }),
  });
}

function mockNewSignupInsert() {
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
  const verifyOtp = vi.fn().mockResolvedValue({
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
    auth: { admin: { generateLink }, verifyOtp },
    from,
  });
  return { generateLink, verifyOtp, insert };
}

describe("POST /api/checkout/ensure-session", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isPlatformOpen.mockReturnValue(true);
    isGuestCheckoutEnabled.mockReturnValue(false);
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

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("Existing@Example.com"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.requiresLogin).toBe(true);
    expect(body.session).toBeUndefined();
    expect(body.access_token).toBeUndefined();
    expect(generateLink).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
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
    const { generateLink, verifyOtp, insert } = mockNewSignupInsert();

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("brand.new@example.com"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.autoSignedIn).toBe(true);
    expect(body.guest).toBe(false);
    expect(body.session).toEqual({
      access_token: "access-xyz",
      refresh_token: "refresh-xyz",
    });
    expect(generateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "brand.new@example.com",
    });
    expect(verifyOtp).toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "new-user-1",
        email: "brand.new@example.com",
        role: "user",
      }),
    );
    expect(finalizeSignupAfterAuth).toHaveBeenCalled();
  });

  it("flag OFF (PLATFORM_OPEN only): insert payload has no guest_checkout_at", async () => {
    isPlatformOpen.mockReturnValue(true);
    isGuestCheckoutEnabled.mockReturnValue(false);
    existingCheckoutEmailTaken.mockResolvedValue(false);
    const { insert } = mockNewSignupInsert();

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("safe.before.migrate@example.com"));
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
    const payload = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("guest_checkout_at");
    expect(payload).not.toHaveProperty("account_claimed_at");
  });

  it("flag ON: insert payload includes guest_checkout_at", async () => {
    isPlatformOpen.mockReturnValue(true);
    isGuestCheckoutEnabled.mockReturnValue(true);
    existingCheckoutEmailTaken.mockResolvedValue(false);
    const { insert } = mockNewSignupInsert();

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(
      makeRequest("guest.on@example.com", { countryCode: "SE" }),
    );
    expect(res.status).toBe(200);
    const payload = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toHaveProperty("guest_checkout_at");
    expect(typeof payload.guest_checkout_at).toBe("string");
  });

  it("guest flag ON + !platformOpen + missing countryCode → 403 (no fall-through)", async () => {
    isPlatformOpen.mockReturnValue(false);
    isGuestCheckoutEnabled.mockReturnValue(true);
    const generateLink = vi.fn();
    getSupabaseAdmin.mockReturnValue({
      auth: { admin: { generateLink }, verifyOtp: vi.fn() },
      from: vi.fn(),
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("se.required@example.com"));
    expect(res.status).toBe(403);
    expect(existingCheckoutEmailTaken).not.toHaveBeenCalled();
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("guest flag ON + !platformOpen + empty countryCode → 403", async () => {
    isPlatformOpen.mockReturnValue(false);
    isGuestCheckoutEnabled.mockReturnValue(true);

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(
      makeRequest("se.required@example.com", { countryCode: "" }),
    );
    expect(res.status).toBe(403);
    expect(existingCheckoutEmailTaken).not.toHaveBeenCalled();
  });

  it("guest flag ON + !platformOpen + non-SE countryCode → 403", async () => {
    isPlatformOpen.mockReturnValue(false);
    isGuestCheckoutEnabled.mockReturnValue(true);

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(
      makeRequest("no@example.com", { countryCode: "NO" }),
    );
    expect(res.status).toBe(403);
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
    const verifyOtp = vi.fn();
    const from = vi.fn();
    getSupabaseAdmin.mockReturnValue({
      auth: { admin: { generateLink }, verifyOtp },
      from,
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("sneaky@example.com"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.requiresLogin).toBe(true);
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
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
    const verifyOtp = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "a",
          refresh_token: "r",
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
      auth: { admin: { generateLink }, verifyOtp },
      from,
    });

    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("race@example.com"));
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns 403 when platform is closed", async () => {
    isPlatformOpen.mockReturnValue(false);
    const { POST } = await import("@/app/api/checkout/ensure-session/route");
    const res = await POST(makeRequest("x@example.com"));
    expect(res.status).toBe(403);
    expect(existingCheckoutEmailTaken).not.toHaveBeenCalled();
  });
});
