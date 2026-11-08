/**
 * Idempotent reuse + Stripe Idempotency-Key for shared-pallet intents.
 *
 * HIGH1: Reuse must bind cart, currency, legal, promo/points, customer, and
 * the PaymentIntent's actual amount — not amount alone (stale cart risk).
 * HIGH2: Process-local single-flight is NOT distributed; Stripe Idempotency-Key
 * is the cross-instance create guard. List+create run inside one flight.
 * MEDIUM: PI reuse only `requires_payment_method` with no attached method.
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
};

export type SharedPalletIntentReuseInput = {
  intents: StripeIntentLike[];
  context: SharedPalletIntentContext;
  /** Discriminator for docs/tests — matching uses intent fields + metadata. */
  intentKind: "payment_intent" | "setup_intent";
};

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
 * SetupIntent reuse for shared (non-conditional) — requires_payment_method only.
 * Conditional US SI keeps its own route matching; this helper refuses conditionals.
 */
export function shouldReuseOpenSharedPalletSetupIntent(args: {
  candidate: StripeIntentLike;
  context: SharedPalletIntentContext;
}): boolean {
  const { candidate, context } = args;
  if (context.usConditional) return false;
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
  if (meta.reservation_mode === "conditional") return false;
  if (!metaEq(meta, "age_verified_dob", context.ageVerifiedDob)) return false;
  if (!metaEq(meta, "age_verification_method", context.ageVerificationMethod)) {
    return false;
  }
  if (
    !context.purchaseTermsVersion ||
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

/**
 * Deterministic Stripe Idempotency-Key (≤255 chars).
 * Versioned so semantics can expire/rotate; Stripe keys last ~24h.
 */
export const SHARED_PALLET_IDEMPOTENCY_VERSION = "v1";

export function buildSharedPalletStripeIdempotencyKey(parts: {
  intentKind: "payment_intent" | "setup_intent";
  context: SharedPalletIntentContext;
}): string {
  const c = parts.context;
  const material = [
    SHARED_PALLET_IDEMPOTENCY_VERSION,
    parts.intentKind,
    c.sessionUserId,
    c.cartId,
    c.palletId,
    String(c.expectedAmountOre),
    c.currency.toLowerCase(),
    c.stripeCustomerId,
    String(c.pactPointsRedeem),
    String(c.promoDiscountSek),
    String(c.voucherDiscountSek),
    c.ageVerifiedDob,
    c.ageVerificationMethod,
    c.purchaseTermsVersion ?? "",
    c.usConditional ? "us_cond" : "shared",
    c.usRegion ?? "",
  ].join("|");
  const digest = createHash("sha256").update(material, "utf8").digest("hex");
  // Stripe idempotency keys: printable ASCII, max 255.
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
