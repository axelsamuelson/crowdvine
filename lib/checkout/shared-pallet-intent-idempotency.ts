/**
 * Idempotent reuse + Stripe Idempotency-Key for shared-pallet intents.
 *
 * Reuse binds cart, currency, legal, promo/points, customer, and PI amount.
 * Process-local single-flight is NOT distributed; Stripe Idempotency-Key is.
 * PI/SI handoff only when fresh state is requires_payment_method, no PM.
 *
 * Stripe Idempotency-Key returns the *original create body* for ~24h, not the
 * live intent status. After create/replay, always retrieve by id and validate
 * that fresh object. Never mint a sibling intent when a same-context prior is
 * paid, in-flight, attached, canceled, or otherwise non-handoffable.
 */

import { createHash } from "crypto";

export type StripeIntentLike = {
  id: string;
  status: string;
  client_secret?: string | null;
  metadata?: Record<string, string> | null;
  /** PI amount in minor units; required for payment_intent reuse. */
  amount?: number | null;
  currency?: string | null;
  customer?: string | null;
  /** Attached payment method id if any. */
  payment_method?: string | null;
};

export type SharedPalletIntentContext = {
  sessionUserId: string;
  cartId: string;
  palletId: string;
  expectedAmountOre: number;
  currency: string;
  stripeCustomerId: string;
  pactPointsRedeem: number;
  promoDiscountSek: number;
  voucherDiscountSek: number;
  ageVerifiedDob: string;
  ageVerificationMethod: string;
  /** Required for non-conditional shared SI/PI. */
  purchaseTermsVersion: string | null;
  /** When true, US conditional SI path — separate matching rules. */
  usConditional?: boolean;
  usRegion?: string | null;
  /**
   * US conditional SI create binds terms_version metadata to this constant.
   * Must participate in Idempotency-Key material so a constant bump within
   * Stripe's ~24h key window does not collide (same key / different params).
   */
  usConditionalTermsVersion?: string | null;
};

export type SharedPalletIntentReuseInput = {
  intents: StripeIntentLike[];
  context: SharedPalletIntentContext;
  intentKind: "payment_intent" | "setup_intent";
};

export class SharedPalletIntentUnusableError extends Error {
  readonly code: string;
  readonly intentId: string | null;
  readonly intentStatus: string | null;

  constructor(args: {
    code: string;
    message: string;
    intentId?: string | null;
    intentStatus?: string | null;
  }) {
    super(args.message);
    this.name = "SharedPalletIntentUnusableError";
    this.code = args.code;
    this.intentId = args.intentId ?? null;
    this.intentStatus = args.intentStatus ?? null;
  }
}

function metaEq(
  meta: Record<string, string>,
  key: string,
  expected: string,
): boolean {
  return String(meta[key] ?? "").trim() === String(expected).trim();
}

/** Server-derived snapshot identity (no status / PM / client_secret). */
export function matchesSharedPalletIntentIdentity(args: {
  candidate: StripeIntentLike;
  context: SharedPalletIntentContext;
  intentKind: "payment_intent" | "setup_intent";
}): boolean {
  const { candidate, context, intentKind } = args;
  const meta = candidate.metadata ?? {};
  if (!metaEq(meta, "user_id", context.sessionUserId)) return false;
  if (!metaEq(meta, "cart_id", context.cartId)) return false;
  if (!metaEq(meta, "pallet_id", context.palletId)) return false;
  if (!metaEq(meta, "expected_amount_ore", String(context.expectedAmountOre))) {
    return false;
  }
  if (!metaEq(meta, "age_verified_dob", context.ageVerifiedDob)) return false;
  if (!metaEq(meta, "age_verification_method", context.ageVerificationMethod)) {
    return false;
  }
  if (!metaEq(meta, "pact_points_redeem", String(context.pactPointsRedeem))) {
    return false;
  }
  if (!metaEq(meta, "promo_discount_sek", String(context.promoDiscountSek))) {
    return false;
  }
  if (
    !metaEq(meta, "voucher_discount_sek", String(context.voucherDiscountSek))
  ) {
    return false;
  }

  if (intentKind === "payment_intent") {
    if (!metaEq(meta, "fulfillment_channel", "shared_pallet")) return false;
    if (meta.reservation_mode === "conditional") return false;
    if (Number(candidate.amount) !== Number(context.expectedAmountOre)) {
      return false;
    }
    if (
      String(candidate.currency || "")
        .trim()
        .toLowerCase() !== String(context.currency).trim().toLowerCase()
    ) {
      return false;
    }
    if (
      candidate.customer &&
      String(candidate.customer).trim() !==
        String(context.stripeCustomerId).trim()
    ) {
      return false;
    }
    const metaCustomer = String(meta.stripe_customer_id ?? "").trim();
    if (
      metaCustomer &&
      metaCustomer !== String(context.stripeCustomerId).trim()
    ) {
      return false;
    }
    if (
      context.purchaseTermsVersion &&
      !metaEq(meta, "purchase_terms_version", context.purchaseTermsVersion)
    ) {
      return false;
    }
    return true;
  }

  // setup_intent
  if (context.usConditional) {
    if (meta.reservation_mode !== "conditional") return false;
    if (!metaEq(meta, "country_code", "US")) return false;
    if (!metaEq(meta, "market_code", "US")) return false;
    if (!context.usRegion || !metaEq(meta, "region", context.usRegion)) {
      return false;
    }
    if (
      !context.usConditionalTermsVersion ||
      !metaEq(meta, "terms_version", context.usConditionalTermsVersion)
    ) {
      return false;
    }
    return true;
  }

  if (meta.reservation_mode === "conditional") return false;
  if (
    !context.purchaseTermsVersion ||
    !metaEq(meta, "purchase_terms_version", context.purchaseTermsVersion)
  ) {
    return false;
  }
  return true;
}

/**
 * Shared-pallet PaymentIntent reuse — fail closed on any context drift.
 * Only requires_payment_method; never requires_confirmation (attached PM risk).
 */
export function shouldReuseOpenSharedPalletPaymentIntent(args: {
  candidate: StripeIntentLike;
  context: SharedPalletIntentContext;
}): boolean {
  const { candidate, context } = args;
  if (
    !matchesSharedPalletIntentIdentity({
      candidate,
      context,
      intentKind: "payment_intent",
    })
  ) {
    return false;
  }
  if (String(candidate.status || "") !== "requires_payment_method") return false;
  if (candidate.payment_method) return false;
  if (!candidate.client_secret) return false;
  return true;
}

/**
 * SetupIntent reuse — requires_payment_method only, no attached method.
 */
export function shouldReuseOpenSharedPalletSetupIntent(args: {
  candidate: StripeIntentLike;
  context: SharedPalletIntentContext;
}): boolean {
  const { candidate, context } = args;
  if (
    !matchesSharedPalletIntentIdentity({
      candidate,
      context,
      intentKind: "setup_intent",
    })
  ) {
    return false;
  }
  if (String(candidate.status || "") !== "requires_payment_method") return false;
  if (candidate.payment_method) return false;
  if (!candidate.client_secret) return false;
  return true;
}

export function findReusableSharedPalletIntent(
  input: SharedPalletIntentReuseInput,
): StripeIntentLike | null {
  const matcher =
    input.intentKind === "payment_intent"
      ? shouldReuseOpenSharedPalletPaymentIntent
      : shouldReuseOpenSharedPalletSetupIntent;
  return (
    input.intents.find((candidate) =>
      matcher({ candidate, context: input.context }),
    ) ?? null
  );
}

export function isReusableSharedPalletIntent(args: {
  intentKind: "payment_intent" | "setup_intent";
  candidate: StripeIntentLike;
  context: SharedPalletIntentContext;
}): boolean {
  return args.intentKind === "payment_intent"
    ? shouldReuseOpenSharedPalletPaymentIntent(args)
    : shouldReuseOpenSharedPalletSetupIntent(args);
}

/**
 * Same-context prior that is NOT handoffable. List must fail closed on these
 * before create — otherwise Idempotency-Key replay can return a stale RPM
 * create body while live state is paid / in-flight / attached / canceled.
 */
export function findBlockingSharedPalletIntent(
  input: SharedPalletIntentReuseInput,
): StripeIntentLike | null {
  return (
    input.intents.find(
      (candidate) =>
        matchesSharedPalletIntentIdentity({
          candidate,
          context: input.context,
          intentKind: input.intentKind,
        }) &&
        !isReusableSharedPalletIntent({
          intentKind: input.intentKind,
          candidate,
          context: input.context,
        }),
    ) ?? null
  );
}

/**
 * Deterministic Stripe Idempotency-Key (≤255 chars).
 * Versioned so semantics can expire/rotate; Stripe keys last ~24h.
 * v2: includes usConditionalTermsVersion in material.
 */
export const SHARED_PALLET_IDEMPOTENCY_VERSION = "v2";

function sharedPalletIdempotencyMaterial(
  intentKind: "payment_intent" | "setup_intent",
  context: SharedPalletIntentContext,
): string {
  return [
    SHARED_PALLET_IDEMPOTENCY_VERSION,
    intentKind,
    context.sessionUserId,
    context.cartId,
    context.palletId,
    String(context.expectedAmountOre),
    context.currency.toLowerCase(),
    context.stripeCustomerId,
    String(context.pactPointsRedeem),
    String(context.promoDiscountSek),
    String(context.voucherDiscountSek),
    context.ageVerifiedDob,
    context.ageVerificationMethod,
    context.purchaseTermsVersion ?? "",
    context.usConditional ? "us_cond" : "shared",
    context.usRegion ?? "",
    context.usConditional
      ? String(context.usConditionalTermsVersion ?? "").trim()
      : "",
  ].join("|");
}

export function buildSharedPalletStripeIdempotencyKey(parts: {
  intentKind: "payment_intent" | "setup_intent";
  context: SharedPalletIntentContext;
}): string {
  const digest = createHash("sha256")
    .update(
      sharedPalletIdempotencyMaterial(parts.intentKind, parts.context),
      "utf8",
    )
    .digest("hex");
  return `sp_${parts.intentKind}_${SHARED_PALLET_IDEMPOTENCY_VERSION}_${digest}`;
}

/** Metadata bound on create so later reuse can fail closed. */
export function buildSharedPalletIntentMetadata(
  context: SharedPalletIntentContext,
  extra: Record<string, string> = {},
): Record<string, string> {
  const meta: Record<string, string> = {
    user_id: context.sessionUserId,
    cart_id: context.cartId,
    pallet_id: context.palletId,
    fulfillment_channel: "shared_pallet",
    expected_amount_ore: String(context.expectedAmountOre),
    stripe_customer_id: context.stripeCustomerId,
    pact_points_redeem: String(context.pactPointsRedeem),
    promo_discount_sek: String(context.promoDiscountSek),
    voucher_discount_sek: String(context.voucherDiscountSek),
    age_verified_dob: context.ageVerifiedDob,
    age_verification_method: context.ageVerificationMethod,
    ...extra,
  };
  if (context.purchaseTermsVersion) {
    meta.purchase_terms_version = context.purchaseTermsVersion;
  }
  return meta;
}

/**
 * Create under Idempotency-Key, then retrieve authoritative live state.
 * Never trusts the create/replay body for status/PM/secret handoff.
 * Never mints a sibling intent on mismatch — fail closed (409).
 */
export async function createSharedPalletIntentWithFreshRetrieve<
  T extends StripeIntentLike,
>(args: {
  intentKind: "payment_intent" | "setup_intent";
  context: SharedPalletIntentContext;
  create: (idempotencyKey: string) => Promise<T>;
  retrieve: (intentId: string) => Promise<T>;
  toLike?: (intent: T) => StripeIntentLike;
}): Promise<{ intent: T; idempotencyKeyUsed: string }> {
  const toLike =
    args.toLike ?? ((intent: T) => intent as unknown as StripeIntentLike);

  const idempotencyKey = buildSharedPalletStripeIdempotencyKey({
    intentKind: args.intentKind,
    context: args.context,
  });
  const created = await args.create(idempotencyKey);
  const createdLike = toLike(created);
  const intentId = String(createdLike.id || "").trim();
  if (!intentId) {
    throw new SharedPalletIntentUnusableError({
      code: "create_missing_intent_id",
      message: "Stripe create/replay returned no intent id.",
      intentId: null,
      intentStatus: createdLike.status ?? null,
    });
  }

  let fresh: T;
  try {
    fresh = await args.retrieve(intentId);
  } catch (err) {
    throw new SharedPalletIntentUnusableError({
      code: "intent_retrieve_failed",
      message:
        err instanceof Error
          ? `Failed to retrieve authoritative Stripe intent: ${err.message}`
          : "Failed to retrieve authoritative Stripe intent.",
      intentId,
      intentStatus: null,
    });
  }

  const freshLike = toLike(fresh);
  if (
    !isReusableSharedPalletIntent({
      intentKind: args.intentKind,
      candidate: freshLike,
      context: args.context,
    })
  ) {
    throw new SharedPalletIntentUnusableError({
      code: "prior_intent_not_handoffable",
      message:
        "Authoritative Stripe intent for this checkout snapshot is not a fresh requires_payment_method handoff (paid, in-flight, attached, canceled, or mismatched).",
      intentId: freshLike.id,
      intentStatus: freshLike.status,
    });
  }

  return { intent: fresh, idempotencyKeyUsed: idempotencyKey };
}

/**
 * Process-local single-flight for list+create. Does NOT replace Stripe
 * Idempotency-Key across Vercel instances.
 */
const inflight = new Map<string, Promise<unknown>>();

export function sharedPalletIntentFlightKey(idempotencyKey: string): string {
  return idempotencyKey;
}

export async function withSharedPalletIntentSingleFlight<T>(
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = factory().finally(() => {
    if (inflight.get(key) === p) inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

export function resetSharedPalletIntentFlightsForTests(): void {
  inflight.clear();
}
