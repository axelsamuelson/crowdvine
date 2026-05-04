import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ProfileBillingRow = {
  stripe_customer_id: string | null;
  email: string | null;
  full_name: string | null;
};

type MembershipRow = {
  stripe_customer_id: string | null;
};

export function normalizeStripeCustomerId(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s !== "" ? s : null;
}

function isDeletedStripeCustomer(c: unknown): boolean {
  return Boolean(
    c &&
      typeof c === "object" &&
      "deleted" in c &&
      (c as { deleted?: unknown }).deleted,
  );
}

async function loadProfileBilling(
  userId: string,
): Promise<ProfileBillingRow | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("profiles")
    .select("stripe_customer_id, email, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadLegacyMembershipCustomerId(
  userId: string,
): Promise<string | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("user_memberships")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle<MembershipRow>();

  if (error) {
    console.error("[Stripe] legacy membership customer lookup failed", error);
    throw error;
  }
  return normalizeStripeCustomerId(data?.stripe_customer_id);
}

/** Clear stored ids when Stripe says the customer is gone (profile + legacy membership). */
async function clearStripeCustomerEverywhere(userId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  await sb
    .from("profiles")
    .update({ stripe_customer_id: null })
    .eq("id", userId);
  await sb
    .from("user_memberships")
    .update({ stripe_customer_id: null })
    .eq("user_id", userId);
}

/**
 * Set profile stripe_customer_id only if still null (race-safe).
 * Mirrors the winning id onto user_memberships for legacy readers.
 */
async function persistStripeCustomerId(
  userId: string,
  customerId: string,
): Promise<string> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId)
    .is("stripe_customer_id", null)
    .select("stripe_customer_id")
    .maybeSingle();

  if (error) throw error;

  const applied = normalizeStripeCustomerId(data?.stripe_customer_id);
  let finalId: string;
  if (applied === customerId) {
    finalId = customerId;
  } else {
    const { data: row } = await sb
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    const existing = normalizeStripeCustomerId(row?.stripe_customer_id);
    if (!existing) {
      throw new Error(
        `[Stripe] race: profile stripe_customer_id unset after CAS for user ${userId}`,
      );
    }
    finalId = existing;
  }

  await sb
    .from("user_memberships")
    .update({ stripe_customer_id: finalId })
    .eq("user_id", userId);

  return finalId;
}

async function verifyStripeCustomer(
  customerId: string,
): Promise<"ok" | "missing"> {
  if (!stripe) throw new Error("Stripe is not configured");
  try {
    const c = await stripe.customers.retrieve(customerId);
    if (isDeletedStripeCustomer(c)) return "missing";
    return "ok";
  } catch {
    return "missing";
  }
}

/**
 * Read-only: profile.stripe_customer_id first, then legacy user_memberships.
 * Does not call Stripe or create customers.
 */
export async function getStripeCustomerId(
  userId: string,
): Promise<string | null> {
  const profile = await loadProfileBilling(userId);
  const fromProfile = normalizeStripeCustomerId(profile?.stripe_customer_id);
  if (fromProfile) return fromProfile;
  return loadLegacyMembershipCustomerId(userId);
}

/**
 * Profile is the billing entity: load or create exactly one Stripe customer per user.
 * Uses a NULL-only profile update so concurrent requests do not persist two winners.
 * Legacy user_memberships.stripe_customer_id is used only when profile is empty; valid ids are copied to profile.
 */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  if (!stripe) {
    console.error("[Stripe] Stripe client not configured");
    throw new Error("Stripe is not configured");
  }

  let profile = await loadProfileBilling(userId);
  if (!profile) {
    throw new Error(`Missing profile for user ${userId}`);
  }

  const pid = normalizeStripeCustomerId(profile.stripe_customer_id);
  if (pid) {
    const v = await verifyStripeCustomer(pid);
    if (v === "ok") return pid;
    console.warn(
      "[Stripe] profile stripe_customer_id invalid; clearing",
      pid,
      userId,
    );
    await clearStripeCustomerEverywhere(userId);
    profile = await loadProfileBilling(userId);
    if (!profile) throw new Error(`Missing profile for user ${userId}`);
  }

  const legacy = await loadLegacyMembershipCustomerId(userId);
  if (legacy) {
    const v = await verifyStripeCustomer(legacy);
    if (v === "ok") {
      return await persistStripeCustomerId(userId, legacy);
    }
    console.warn(
      "[Stripe] legacy membership stripe_customer_id invalid; clearing membership column",
      legacy,
      userId,
    );
    const sb = getSupabaseAdmin();
    await sb
      .from("user_memberships")
      .update({ stripe_customer_id: null })
      .eq("user_id", userId);
  }

  const email =
    typeof profile.email === "string" && profile.email.trim() !== ""
      ? profile.email.trim()
      : null;
  const name =
    typeof profile.full_name === "string" && profile.full_name.trim() !== ""
      ? profile.full_name.trim()
      : undefined;

  if (!email) {
    throw new Error(`Missing email for user ${userId}`);
  }

  const created = await stripe.customers.create({
    email,
    name,
    metadata: { user_id: userId },
  });

  const finalId = await persistStripeCustomerId(userId, created.id);
  if (finalId !== created.id) {
    console.info(
      "[Stripe] concurrent getOrCreateStripeCustomer; using existing profile customer",
      { userId, winner: finalId, created: created.id },
    );
  }

  return finalId;
}
