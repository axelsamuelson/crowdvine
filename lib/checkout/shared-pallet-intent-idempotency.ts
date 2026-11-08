/**
 * Idempotent reuse for shared-pallet PaymentIntents / SetupIntents.
 * Addresses observed duplicate unconfirmed intents after a single Continue
 * (two client POSTs; race unproven). Server must still dedupe by metadata.
 *
 * Does not cancel orphans; only prefers an open matching intent.
 */

export type StripeIntentLike = {
  id: string;
  status: string;
  client_secret?: string | null;
  metadata?: Record<string, string> | null;
};

export type SharedPalletIntentReuseInput = {
  intents: StripeIntentLike[];
  sessionUserId: string;
  palletId: string;
  expectedAmountOre: number;
  /** payment_intent | setup_intent */
  mode: "payment_intent" | "setup_intent";
};

const REUSABLE_STATUSES = new Set(["requires_payment_method", "requires_confirmation"]);

export function shouldReuseOpenSharedPalletIntent(
  args: SharedPalletIntentReuseInput & { candidate: StripeIntentLike },
): boolean {
  const meta = args.candidate.metadata ?? {};
  if (!REUSABLE_STATUSES.has(String(args.candidate.status || ""))) return false;
  if (meta.user_id !== args.sessionUserId) return false;
  if (meta.pallet_id !== args.palletId) return false;
  if (meta.expected_amount_ore !== String(args.expectedAmountOre)) return false;
  if (meta.fulfillment_channel && meta.fulfillment_channel !== "shared_pallet") {
    return false;
  }
  // US conditional SIs must not match shared deferred SI/PI reuse.
  if (meta.reservation_mode === "conditional") return false;
  return Boolean(args.candidate.client_secret);
}

export function findReusableSharedPalletIntent(
  input: SharedPalletIntentReuseInput,
): StripeIntentLike | null {
  return (
    input.intents.find((candidate) =>
      shouldReuseOpenSharedPalletIntent({ ...input, candidate }),
    ) ?? null
  );
}

/**
 * In-process single-flight key for concurrent identical creates.
 * Process-local only — complements Stripe metadata reuse across instances.
 */
const inflight = new Map<string, Promise<unknown>>();

export function sharedPalletIntentFlightKey(parts: {
  mode: "payment_intent" | "setup_intent";
  userId: string;
  palletId: string;
  amountOre: number;
}): string {
  return [
    parts.mode,
    parts.userId,
    parts.palletId,
    String(parts.amountOre),
  ].join("|");
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

/** Test helper — clear process-local flights. */
export function resetSharedPalletIntentFlightsForTests(): void {
  inflight.clear();
}
