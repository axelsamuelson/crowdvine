import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type MembershipRow = {
  stripe_customer_id: string | null;
};

type ProfileRow = {
  email: string | null;
  full_name: string | null;
};

export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  if (!stripe) {
    console.error("[Stripe] Stripe client not configured");
    throw new Error("Stripe is not configured");
  }

  const sb = getSupabaseAdmin();

  try {
    const { data: membership, error: membershipError } = await sb
      .from("user_memberships")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle<MembershipRow>();

    if (membershipError) throw membershipError;

    const existingId =
      membership?.stripe_customer_id && membership.stripe_customer_id.trim() !== ""
        ? membership.stripe_customer_id
        : null;

    if (existingId) {
      try {
        const c = await stripe.customers.retrieve(existingId);
        const isDeleted =
          c && typeof c === "object" && "deleted" in c
            ? Boolean((c as { deleted?: unknown }).deleted)
            : false;
        if (!isDeleted) return existingId;
      } catch (e) {
        console.warn(
          "[Stripe] Existing customer lookup failed; will recreate",
          existingId,
        );
      }

      // Customer missing/deleted -> null it out and recreate
      await sb
        .from("user_memberships")
        .update({ stripe_customer_id: null })
        .eq("user_id", userId);
    }

    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

    if (profileError) throw profileError;

    const email =
      typeof profile?.email === "string" && profile.email.trim() !== ""
        ? profile.email.trim()
        : null;
    const name =
      typeof profile?.full_name === "string" && profile.full_name.trim() !== ""
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

    const { error: saveError } = await sb
      .from("user_memberships")
      .update({ stripe_customer_id: created.id })
      .eq("user_id", userId);

    if (saveError) throw saveError;

    return created.id;
  } catch (err) {
    console.error("[Stripe] getOrCreateStripeCustomer failed", err);
    throw err;
  }
}

