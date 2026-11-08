/**
 * TEMPORARY preview-only Stripe/Supabase binding diagnostic (PR205).
 *
 * Flag: CHECKOUT_BINDING_DIAG_ENABLED=true (branch preview env)
 * Route: GET /api/debug/checkout-binding-diag
 *
 * CLEANUP: delete this module, the route, and its tests once binding proof /
 * Inès review is complete. Expect ~1–2 preview rebuilds to flip the flag off
 * and remove the code; do not leave the flag enabled.
 */

export const CHECKOUT_BINDING_DIAG_FLAG = "CHECKOUT_BINDING_DIAG_ENABLED";

export const CHECKOUT_BINDING_DIAG_EXPECTED_BRANCH =
  "cursor/checkout-pi-charge-copy-26c3";

export const CHECKOUT_BINDING_DIAG_EXPECTED_SUPABASE_REF =
  "msdfjrrokcmjifetuwgc";

export const CHECKOUT_BINDING_DIAG_ALLOWED_USER_ID =
  "d8157bbd-3d02-41d6-adb3-c12f8d5ba159";

export const CHECKOUT_BINDING_DIAG_EXPECTED_ACCOUNT_ID =
  "acct_1S0puV01MNqMozNK";

export type SecretKeyClass = "sk_test" | "rk_test";
export type PublishableKeyClass = "pk_test";

export type DiagErrorCode =
  | "not_found"
  | "unauthorized"
  | "forbidden_user"
  | "keys_missing"
  | "secret_not_test"
  | "publishable_not_test"
  | "stripe_account_forbidden"
  | "stripe_account_error"
  | "stripe_balance_error";

export type DiagSuccessBody = {
  ok: true;
  accountId: string;
  livemode: boolean;
  secretKeyClass: SecretKeyClass;
  publishableKeyClass: PublishableKeyClass;
  /** Hostname only (e.g. msdf….supabase.co) — never keys */
  supabaseHost: string;
  commitSha: string;
  expectedMatch: {
    accountId: boolean;
    livemodeFalse: boolean;
  };
  /**
   * Publishable keys do not expose account id via a documented read-only
   * identity API usable here. pk_test class is proven; account linkage is not.
   */
  publishableAccountMatch: "unproven";
};

export type DiagErrorBody = {
  ok: false;
  error: DiagErrorCode;
};

export type DiagResult = {
  status: number;
  body: DiagSuccessBody | DiagErrorBody;
};

export type DiagUser = {
  id: string;
  role: string;
};

export type StripeDiagReads = {
  accountId: string;
  accountLivemode: boolean;
  balanceLivemode: boolean;
};

function isEnabled(env: NodeJS.ProcessEnv): boolean {
  return (env[CHECKOUT_BINDING_DIAG_FLAG] || "").trim() === "true";
}

export function supabaseHostFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function classifySecretKey(secret: string): SecretKeyClass | null {
  if (secret.startsWith("sk_test_")) return "sk_test";
  if (secret.startsWith("rk_test_")) return "rk_test";
  return null;
}

export function classifyPublishableKey(
  publishable: string,
): PublishableKeyClass | null {
  if (publishable.startsWith("pk_test_")) return "pk_test";
  return null;
}

/**
 * Fail closed before auth/Stripe. Opaque 404 for any env/branch/host mismatch.
 */
export function evaluateEnvGates(env: NodeJS.ProcessEnv):
  | { ok: true; supabaseHost: string; commitSha: string }
  | { ok: false; result: DiagResult } {
  if (!isEnabled(env)) {
    return {
      ok: false,
      result: { status: 404, body: { ok: false, error: "not_found" } },
    };
  }

  if ((env.VERCEL_ENV || "").trim() !== "preview") {
    return {
      ok: false,
      result: { status: 404, body: { ok: false, error: "not_found" } },
    };
  }

  if (
    (env.VERCEL_GIT_COMMIT_REF || "").trim() !==
    CHECKOUT_BINDING_DIAG_EXPECTED_BRANCH
  ) {
    return {
      ok: false,
      result: { status: 404, body: { ok: false, error: "not_found" } },
    };
  }

  const supabaseHost = supabaseHostFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  if (
    !supabaseHost ||
    !supabaseHost.includes(CHECKOUT_BINDING_DIAG_EXPECTED_SUPABASE_REF)
  ) {
    return {
      ok: false,
      result: { status: 404, body: { ok: false, error: "not_found" } },
    };
  }

  const commitSha = (env.VERCEL_GIT_COMMIT_SHA || "").trim() || "unknown";

  return { ok: true, supabaseHost, commitSha };
}

export function evaluateAuth(user: DiagUser | null): DiagResult | null {
  if (!user) {
    return { status: 401, body: { ok: false, error: "unauthorized" } };
  }
  if (user.id !== CHECKOUT_BINDING_DIAG_ALLOWED_USER_ID) {
    return { status: 403, body: { ok: false, error: "forbidden_user" } };
  }
  // Design-review member only — never admin.
  if (user.role !== "user") {
    return { status: 403, body: { ok: false, error: "forbidden_user" } };
  }
  return null;
}

export function evaluateKeyClasses(env: NodeJS.ProcessEnv):
  | { ok: true; secretKey: string; secretKeyClass: SecretKeyClass; publishableKeyClass: PublishableKeyClass }
  | { ok: false; result: DiagResult } {
  const secretKey = (env.STRIPE_SECRET_KEY || "").trim();
  const publishableKey = (env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "").trim();

  if (!secretKey || !publishableKey) {
    return {
      ok: false,
      result: { status: 403, body: { ok: false, error: "keys_missing" } },
    };
  }

  const secretKeyClass = classifySecretKey(secretKey);
  if (!secretKeyClass) {
    return {
      ok: false,
      result: { status: 403, body: { ok: false, error: "secret_not_test" } },
    };
  }

  const publishableKeyClass = classifyPublishableKey(publishableKey);
  if (!publishableKeyClass) {
    return {
      ok: false,
      result: {
        status: 403,
        body: { ok: false, error: "publishable_not_test" },
      },
    };
  }

  return { ok: true, secretKey, secretKeyClass, publishableKeyClass };
}

export function mapStripeAccountError(statusCode: number | undefined): DiagErrorCode {
  if (statusCode === 403) return "stripe_account_forbidden";
  return "stripe_account_error";
}

/**
 * Orchestrates gate → auth → key class → Stripe GET /v1/account + /v1/balance.
 * `stripeReads` must perform only those two read calls (injected for tests).
 */
export async function runCheckoutBindingDiag(deps: {
  env: NodeJS.ProcessEnv;
  getUser: () => Promise<DiagUser | null>;
  stripeReads: (secretKey: string) => Promise<StripeDiagReads>;
}): Promise<DiagResult> {
  const gates = evaluateEnvGates(deps.env);
  if (!gates.ok) return gates.result;

  const user = await deps.getUser();
  const authFail = evaluateAuth(user);
  if (authFail) return authFail;

  const keys = evaluateKeyClasses(deps.env);
  if (!keys.ok) return keys.result;

  let reads: StripeDiagReads;
  try {
    reads = await deps.stripeReads(keys.secretKey);
  } catch (err: unknown) {
    const statusCode =
      err &&
      typeof err === "object" &&
      "statusCode" in err &&
      typeof (err as { statusCode?: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : undefined;
    // Prefer account-phase codes; stripeReads should throw tagged errors if needed.
    const tagged =
      err &&
      typeof err === "object" &&
      "diagPhase" in err &&
      (err as { diagPhase?: unknown }).diagPhase === "balance"
        ? "stripe_balance_error"
        : mapStripeAccountError(statusCode);
    return { status: 502, body: { ok: false, error: tagged } };
  }

  // Prefer account.livemode; balance.livemode must agree for the reported value.
  const livemode = reads.accountLivemode;
  if (reads.balanceLivemode !== reads.accountLivemode) {
    // Do not invent a merged story — treat as account read failure class.
    return {
      status: 502,
      body: { ok: false, error: "stripe_account_error" },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      accountId: reads.accountId,
      livemode,
      secretKeyClass: keys.secretKeyClass,
      publishableKeyClass: keys.publishableKeyClass,
      supabaseHost: gates.supabaseHost,
      commitSha: gates.commitSha,
      expectedMatch: {
        accountId:
          reads.accountId === CHECKOUT_BINDING_DIAG_EXPECTED_ACCOUNT_ID,
        livemodeFalse: livemode === false,
      },
      publishableAccountMatch: "unproven",
    },
  };
}
