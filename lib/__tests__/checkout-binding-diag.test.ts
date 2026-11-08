import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_BINDING_DIAG_ALLOWED_USER_ID,
  CHECKOUT_BINDING_DIAG_EXPECTED_ACCOUNT_ID,
  CHECKOUT_BINDING_DIAG_EXPECTED_BRANCH,
  CHECKOUT_BINDING_DIAG_EXPECTED_SUPABASE_REF,
  CHECKOUT_BINDING_DIAG_FLAG,
  classifyPublishableKey,
  classifySecretKey,
  evaluateAuth,
  evaluateEnvGates,
  evaluateKeyClasses,
  runCheckoutBindingDiag,
} from "@/lib/debug/checkout-binding-diag";

const REVIEW_USER = {
  id: CHECKOUT_BINDING_DIAG_ALLOWED_USER_ID,
  role: "user",
};

function baseEnv(
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    [CHECKOUT_BINDING_DIAG_FLAG]: "true",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: CHECKOUT_BINDING_DIAG_EXPECTED_BRANCH,
    VERCEL_GIT_COMMIT_SHA: "2319e3f9deadbeef",
    NEXT_PUBLIC_SUPABASE_URL: `https://${CHECKOUT_BINDING_DIAG_EXPECTED_SUPABASE_REF}.supabase.co`,
    STRIPE_SECRET_KEY: "sk_test_x",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe("checkout-binding-diag key classifiers", () => {
  it("accepts only sk_test_ / rk_test_ secrets", () => {
    expect(classifySecretKey("sk_test_x")).toBe("sk_test");
    expect(classifySecretKey("rk_test_x")).toBe("rk_test");
    expect(classifySecretKey("sk_live_x")).toBeNull();
    expect(classifySecretKey("rk_live_x")).toBeNull();
    expect(classifySecretKey("pk_test_x")).toBeNull();
  });

  it("accepts only pk_test_ publishable", () => {
    expect(classifyPublishableKey("pk_test_x")).toBe("pk_test");
    expect(classifyPublishableKey("pk_live_x")).toBeNull();
    expect(classifyPublishableKey("sk_test_x")).toBeNull();
  });
});

describe("checkout-binding-diag env gates", () => {
  it("404 when flag off (default)", () => {
    const r = evaluateEnvGates(baseEnv({ [CHECKOUT_BINDING_DIAG_FLAG]: undefined }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.result.status).toBe(404);
      expect(r.result.body).toEqual({ ok: false, error: "not_found" });
    }
  });

  it("404 when VERCEL_ENV is production", () => {
    const r = evaluateEnvGates(baseEnv({ VERCEL_ENV: "production" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.result.status).toBe(404);
  });

  it("404 when branch does not match PR205", () => {
    const r = evaluateEnvGates(
      baseEnv({ VERCEL_GIT_COMMIT_REF: "cursor/checkout-audit-e2e-fixture-26c3" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.result.status).toBe(404);
  });

  it("404 when supabase host is not the test fixture", () => {
    const r = evaluateEnvGates(
      baseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://abrnvjqexample.supabase.co",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.result.status).toBe(404);
  });

  it("passes on preview + PR205 branch + test supabase", () => {
    const r = evaluateEnvGates(baseEnv());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.supabaseHost).toContain(CHECKOUT_BINDING_DIAG_EXPECTED_SUPABASE_REF);
      expect(r.commitSha).toBe("2319e3f9deadbeef");
    }
  });
});

describe("checkout-binding-diag auth", () => {
  it("401 when unauthenticated", () => {
    expect(evaluateAuth(null)?.status).toBe(401);
  });

  it("403 for wrong user id", () => {
    expect(
      evaluateAuth({ id: "00000000-0000-0000-0000-000000000000", role: "user" })
        ?.body,
    ).toEqual({ ok: false, error: "forbidden_user" });
  });

  it("403 for admin role even with allowed id", () => {
    expect(
      evaluateAuth({ id: CHECKOUT_BINDING_DIAG_ALLOWED_USER_ID, role: "admin" })
        ?.body,
    ).toEqual({ ok: false, error: "forbidden_user" });
  });

  it("allows design-review user role=user", () => {
    expect(evaluateAuth(REVIEW_USER)).toBeNull();
  });
});

describe("checkout-binding-diag key class gates", () => {
  it("rejects missing keys before Stripe", () => {
    const r = evaluateKeyClasses(
      baseEnv({ STRIPE_SECRET_KEY: "", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.result.body).toEqual({ ok: false, error: "keys_missing" });
  });

  it("rejects live secret before Stripe", () => {
    const r = evaluateKeyClasses(
      baseEnv({ STRIPE_SECRET_KEY: "sk_live_should_never_call" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.result.body).toEqual({ ok: false, error: "secret_not_test" });
    }
  });

  it("rejects live publishable before Stripe", () => {
    const r = evaluateKeyClasses(
      baseEnv({
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_should_never_call",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.result.body).toEqual({
        ok: false,
        error: "publishable_not_test",
      });
    }
  });
});

describe("runCheckoutBindingDiag orchestration", () => {
  it("does not call Stripe when gate fails", async () => {
    const stripeReads = vi.fn();
    const result = await runCheckoutBindingDiag({
      env: baseEnv({ [CHECKOUT_BINDING_DIAG_FLAG]: "false" }),
      getUser: async () => REVIEW_USER,
      stripeReads,
    });
    expect(result.status).toBe(404);
    expect(stripeReads).not.toHaveBeenCalled();
  });

  it("does not call Stripe when auth fails", async () => {
    const stripeReads = vi.fn();
    const result = await runCheckoutBindingDiag({
      env: baseEnv(),
      getUser: async () => null,
      stripeReads,
    });
    expect(result.status).toBe(401);
    expect(stripeReads).not.toHaveBeenCalled();
  });

  it("does not call Stripe when secret is live", async () => {
    const stripeReads = vi.fn();
    const result = await runCheckoutBindingDiag({
      env: baseEnv({ STRIPE_SECRET_KEY: "sk_live_x" }),
      getUser: async () => REVIEW_USER,
      stripeReads,
    });
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ ok: false, error: "secret_not_test" });
    expect(stripeReads).not.toHaveBeenCalled();
  });

  it("returns sanitized success with expectedMatch and unproven pk account", async () => {
    const stripeReads = vi.fn(async () => ({
      accountId: CHECKOUT_BINDING_DIAG_EXPECTED_ACCOUNT_ID,
      accountLivemode: false,
      balanceLivemode: false,
    }));
    const result = await runCheckoutBindingDiag({
      env: baseEnv(),
      getUser: async () => REVIEW_USER,
      stripeReads,
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      accountId: CHECKOUT_BINDING_DIAG_EXPECTED_ACCOUNT_ID,
      livemode: false,
      secretKeyClass: "sk_test",
      publishableKeyClass: "pk_test",
      supabaseHost: `${CHECKOUT_BINDING_DIAG_EXPECTED_SUPABASE_REF}.supabase.co`,
      commitSha: "2319e3f9deadbeef",
      expectedMatch: { accountId: true, livemodeFalse: true },
      publishableAccountMatch: "unproven",
    });
    expect(JSON.stringify(result.body)).not.toMatch(/sk_test_|pk_test_|rk_test_/);
    expect(stripeReads).toHaveBeenCalledTimes(1);
  });

  it("reports expectedMatch.accountId false when Stripe account differs", async () => {
    const result = await runCheckoutBindingDiag({
      env: baseEnv({ STRIPE_SECRET_KEY: "rk_test_x" }),
      getUser: async () => REVIEW_USER,
      stripeReads: async () => ({
        accountId: "acct_OTHER",
        accountLivemode: false,
        balanceLivemode: false,
      }),
    });
    expect(result.status).toBe(200);
    if (result.body.ok) {
      expect(result.body.secretKeyClass).toBe("rk_test");
      expect(result.body.expectedMatch.accountId).toBe(false);
      expect(result.body.livemode).toBe(false);
    }
  });

  it("maps account 403 to stripe_account_forbidden", async () => {
    const result = await runCheckoutBindingDiag({
      env: baseEnv(),
      getUser: async () => REVIEW_USER,
      stripeReads: async () => {
        throw Object.assign(new Error("forbidden"), {
          statusCode: 403,
          diagPhase: "account",
        });
      },
    });
    expect(result.status).toBe(502);
    expect(result.body).toEqual({
      ok: false,
      error: "stripe_account_forbidden",
    });
  });

  it("maps balance-phase failure to stripe_balance_error", async () => {
    const result = await runCheckoutBindingDiag({
      env: baseEnv(),
      getUser: async () => REVIEW_USER,
      stripeReads: async () => {
        throw Object.assign(new Error("balance boom"), {
          statusCode: 500,
          diagPhase: "balance",
        });
      },
    });
    expect(result.status).toBe(502);
    expect(result.body).toEqual({
      ok: false,
      error: "stripe_balance_error",
    });
  });

  it("rejects livemode disagreement without inventing account id story", async () => {
    const result = await runCheckoutBindingDiag({
      env: baseEnv(),
      getUser: async () => REVIEW_USER,
      stripeReads: async () => ({
        accountId: CHECKOUT_BINDING_DIAG_EXPECTED_ACCOUNT_ID,
        accountLivemode: false,
        balanceLivemode: true,
      }),
    });
    expect(result.status).toBe(502);
    expect(result.body).toEqual({ ok: false, error: "stripe_account_error" });
  });
});

describe("GET /api/debug/checkout-binding-diag route", () => {
  const getCurrentUser = vi.fn();
  const accountsRetrieve = vi.fn();
  const balanceRetrieve = vi.fn();
  const customersCreate = vi.fn();
  const paymentIntentsCreate = vi.fn();
  const setupIntentsCreate = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    getCurrentUser.mockReset();
    accountsRetrieve.mockReset();
    balanceRetrieve.mockReset();
    customersCreate.mockReset();
    paymentIntentsCreate.mockReset();
    setupIntentsCreate.mockReset();

    vi.doMock("@/lib/auth", () => ({
      getCurrentUser: () => getCurrentUser(),
    }));

    vi.doMock("stripe", () => {
      class MockStripe {
        accounts = { retrieve: accountsRetrieve };
        balance = { retrieve: balanceRetrieve };
        customers = { create: customersCreate };
        paymentIntents = { create: paymentIntentsCreate };
        setupIntents = { create: setupIntentsCreate };
      }
      return { default: MockStripe };
    });

    process.env[CHECKOUT_BINDING_DIAG_FLAG] = "true";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_GIT_COMMIT_REF = CHECKOUT_BINDING_DIAG_EXPECTED_BRANCH;
    process.env.VERCEL_GIT_COMMIT_SHA = "abc123preview";
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${CHECKOUT_BINDING_DIAG_EXPECTED_SUPABASE_REF}.supabase.co`;
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x";
  });

  it("returns no-store success and only issues account+balance GETs", async () => {
    getCurrentUser.mockResolvedValue(REVIEW_USER);
    accountsRetrieve.mockResolvedValue({
      id: CHECKOUT_BINDING_DIAG_EXPECTED_ACCOUNT_ID,
      livemode: false,
    });
    balanceRetrieve.mockResolvedValue({
      livemode: false,
      available: [{ amount: 99999, currency: "sek" }],
      pending: [{ amount: 1, currency: "sek" }],
    });

    const { GET } = await import("@/app/api/debug/checkout-binding-diag/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.accountId).toBe(CHECKOUT_BINDING_DIAG_EXPECTED_ACCOUNT_ID);
    expect(body.livemode).toBe(false);
    expect(body.expectedMatch).toEqual({
      accountId: true,
      livemodeFalse: true,
    });
    expect(body.publishableAccountMatch).toBe("unproven");
    expect(JSON.stringify(body)).not.toMatch(/99999|amount|available|pending/);
    expect(JSON.stringify(body)).not.toMatch(/password|token|Bearer /);

    expect(accountsRetrieve).toHaveBeenCalledTimes(1);
    expect(balanceRetrieve).toHaveBeenCalledTimes(1);
    expect(customersCreate).not.toHaveBeenCalled();
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
    expect(setupIntentsCreate).not.toHaveBeenCalled();
  });

  it("exports GET only (no POST handler that could create Stripe objects)", async () => {
    const mod = await import("@/app/api/debug/checkout-binding-diag/route");
    expect(typeof mod.GET).toBe("function");
    expect((mod as { POST?: unknown }).POST).toBeUndefined();
  });

  it("404 before Stripe when flag disabled", async () => {
    process.env[CHECKOUT_BINDING_DIAG_FLAG] = "false";
    getCurrentUser.mockResolvedValue(REVIEW_USER);
    const { GET } = await import("@/app/api/debug/checkout-binding-diag/route");
    const res = await GET();
    expect(res.status).toBe(404);
    expect(accountsRetrieve).not.toHaveBeenCalled();
    expect(balanceRetrieve).not.toHaveBeenCalled();
  });

  it("returns stripe_account_forbidden on restricted-key account 403", async () => {
    getCurrentUser.mockResolvedValue(REVIEW_USER);
    accountsRetrieve.mockRejectedValue(
      Object.assign(new Error("nope"), { statusCode: 403 }),
    );
    const { GET } = await import("@/app/api/debug/checkout-binding-diag/route");
    const res = await GET();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      ok: false,
      error: "stripe_account_forbidden",
    });
    expect(balanceRetrieve).not.toHaveBeenCalled();
  });
});
