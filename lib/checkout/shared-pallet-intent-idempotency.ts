/**
 * Idempotent reuse + Stripe Idempotency-Key for shared-pallet intents.
 *
 * HIGH1: Reuse must bind cart, currency, legal, promo/points, customer, and
 * the PaymentIntent's actual amount — not amount alone (stale cart risk).
 * HIGH2: Process-local single-flight is NOT distributed; Stripe Idempotency-Key
 * is the cross-instance create guard. List+create run inside one flight.
 * MEDIUM: PI reuse only `requires_payment_method` with no attached method.
 *
 * Idempotency replay: Stripe returns the *original* create body for ~24h even
 * if that intent was later canceled/succeeded/had a method attached. Always
 * re-validate with the same reuse invariants. Recovery uses a deterministic
 * supersedes key (context + dead intent id) — never rotate randomly, never
 * cancel/charge the dead intent. PI succeeded/processing → fail closed
 * (already charged / in flight); do not mint a second chargeable PI.
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
  /** Discriminator for docs/tests — matching uses intent fields + metadata. */
  intentKind: "payment_intent" | "setup_intent";
};

export type SharedPalletIntentReplayDisposition =
  | "ready"
  | "recover"
  | "fail_closed";

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

/**
 * Shared-pallet PaymentIntent reuse — fail closed on any context drift.
 * Only requires_payment_method; never requires_confirmation (attached PM risk).
 */
export function shouldReuseOpenSharedPalletPaymentIntent(args: {
  candidate: StripeIntentLike;
  context: SharedPalletIntentContext;
}): boolean {
  const { candidate, context } = args;
  const meta = candidate.metadata ?? {};
  if (String(candidate.status || "") !== "requires_payment_method") return false;
  if (candidate.payment_method) return false;
  if (!candidate.client_secret) return false;
  if (Number(candidate.amount) !== Number(context.expectedAmountOre)) return false;
  if (
    String(candidate.currency || "")
      .trim()
      .toLowerCase() !== String(context.currency).trim().toLowerCase()
  ) {
    return false;
  }
  if (
    candidate.customer &&
    String(candidate.customer).trim() !== String(context.stripeCustomerId).trim()
  ) {
    return false;
  }
  if (!metaEq(meta, "user_id", context.sessionUserId)) return false;
  if (!metaEq(meta, "cart_id", context.cartId)) return false;
  if (!metaEq(meta, "pallet_id", context.palletId)) return false;
  if (!metaEq(meta, "expected_amount_ore", String(context.expectedAmountOre))) {
    return false;
  }
  if (!metaEq(meta, "fulfillment_channel", "shared_pallet")) return false;
  if (meta.reservation_mode === "conditional") return false;
  if (!metaEq(meta, "age_verified_dob", context.ageVerifiedDob)) return false;
  if (!metaEq(meta, "age_verification_method", context.ageVerificationMethod)) {
    return false;
  }
  if (
    context.purchaseTermsVersion &&
    !metaEq(meta, "purchase_terms_version", context.purchaseTermsVersion)
  ) {
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
  const metaCustomer = String(meta.stripe_customer_id ?? "").trim();
  if (metaCustomer && metaCustomer !== String(context.stripeCustomerId).trim()) {
    return false;
  }
  return true;
}

/**
 * SetupIntent reuse — requires_payment_method only, no attached method.
 * Supports both shared (non-conditional) and US conditional SI snapshots.
 */
export function shouldReuseOpenSharedPalletSetupIntent(args: {
  candidate: StripeIntentLike;
  context: SharedPalletIntentContext;
}): boolean {
  const { candidate, context } = args;
  const meta = candidate.metadata ?? {};
  if (String(candidate.status || "") !== "requires_payment_method") return false;
  if (candidate.payment_method) return false;
  if (!candidate.client_secret) return false;
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
 * After list-miss create (including Stripe Idempotency-Key replay), decide
 * whether the returned object is checkout-ready, recoverable, or fail-closed.
 *
 * PI succeeded/processing: already charged / in flight — never mint another
 * chargeable PI under a recovery key for the same cart snapshot.
 */
export function sharedPalletIntentReplayDisposition(args: {
  intentKind: "payment_intent" | "setup_intent";
  candidate: StripeIntentLike;
  context: SharedPalletIntentContext;
}): SharedPalletIntentReplayDisposition {
  if (
    isReusableSharedPalletIntent({
      intentKind: args.intentKind,
      candidate: args.candidate,
      context: args.context,
    })
  ) {
    return "ready";
  }
  const status = String(args.candidate.status || "")
    .trim()
    .toLowerCase();
  if (
    args.intentKind === "payment_intent" &&
    (status === "succeeded" || status === "processing")
  ) {
    return "fail_closed";
  }
  return "recover";
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
    .update(sharedPalletIdempotencyMaterial(parts.intentKind, parts.context), "utf8")
    .digest("hex");
  return `sp_${parts.intentKind}_${SHARED_PALLET_IDEMPOTENCY_VERSION}_${digest}`;
}

/**
 * Deterministic recovery key when base-key replay returns a non-reusable
 * intent. Binds the dead intent id so concurrent callers converge on one
 * successor create — not a random rotate-every-retry.
 */
export function buildSharedPalletRecoveryIdempotencyKey(parts: {
  intentKind: "payment_intent" | "setup_intent";
  context: SharedPalletIntentContext;
  supersedesIntentId: string;
}): string {
  const dead = String(parts.supersedesIntentId || "").trim();
  if (!dead) {
    throw new Error("recovery idempotency key requires supersedesIntentId");
  }
  const material = [
    sharedPalletIdempotencyMaterial(parts.intentKind, parts.context),
    "recover_from",
    dead,
  ].join("|");
  const digest = createHash("sha256").update(material, "utf8").digest("hex");
  return `sp_${parts.intentKind}_${SHARED_PALLET_IDEMPOTENCY_VERSION}_r_${digest}`;
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
 * Create (or accept Idempotency-Key replay), validate, and optionally recover
 * once under a deterministic supersedes key. Does not cancel/charge intents.
 */
export async function createSharedPalletIntentWithReplayGuard<
  T extends StripeIntentLike,
>(args: {
  intentKind: "payment_intent" | "setup_intent";
  context: SharedPalletIntentContext;
  create: (idempotencyKey: string) => Promise<T>;
  toLike?: (intent: T) => StripeIntentLike;
}): Promise<{
  intent: T;
  idempotencyKeyUsed: string;
  recoveredFromId: string | null;
}> {
  const toLike =
    args.toLike ??
    ((intent: T) => intent as unknown as StripeIntentLike);

  const baseKey = buildSharedPalletStripeIdempotencyKey({
    intentKind: args.intentKind,
    context: args.context,
  });
  const first = await args.create(baseKey);
  const firstLike = toLike(first);
  const firstDisposition = sharedPalletIntentReplayDisposition({
    intentKind: args.intentKind,
    candidate: firstLike,
    context: args.context,
  });
  if (firstDisposition === "ready") {
    return {
      intent: first,
      idempotencyKeyUsed: baseKey,
      recoveredFromId: null,
    };
  }
  if (firstDisposition === "fail_closed") {
    throw new SharedPalletIntentUnusableError({
      code:
        args.intentKind === "payment_intent"
          ? "prior_payment_intent_terminal"
          : "prior_setup_intent_unusable",
      message:
        "Prior Stripe intent under this checkout snapshot is no longer usable for a fresh requires_payment_method handoff.",
      intentId: firstLike.id,
      intentStatus: firstLike.status,
    });
  }

  const deadId = String(firstLike.id || "").trim();
  if (!deadId) {
    throw new SharedPalletIntentUnusableError({
      code: "idempotent_replay_missing_intent_id",
      message: "Idempotent Stripe replay returned a non-reusable intent without id.",
      intentId: null,
      intentStatus: firstLike.status,
    });
  }

  const recoveryKey = buildSharedPalletRecoveryIdempotencyKey({
    intentKind: args.intentKind,
    context: args.context,
    supersedesIntentId: deadId,
  });
  const second = await args.create(recoveryKey);
  const secondLike = toLike(second);
  if (
    !isReusableSharedPalletIntent({
      intentKind: args.intentKind,
      candidate: secondLike,
      context: args.context,
    })
  ) {
    throw new SharedPalletIntentUnusableError({
      code: "intent_recovery_unusable",
      message:
        "Recovery Stripe create did not yield a reusable requires_payment_method intent.",
      intentId: secondLike.id,
      intentStatus: secondLike.status,
    });
  }
  return {
    intent: second,
    idempotencyKeyUsed: recoveryKey,
    recoveredFromId: deadId,
  };
}

/**
 * Process-local single-flight for list+create. Does NOT replace Stripe
 * Idempotency-Key across Vercel instances.
 */
const inflight = new Map<string, Promise<unknown>>();

export function sharedPalletIntentFlightKey(
  idempotencyKey: string,
): string {
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
