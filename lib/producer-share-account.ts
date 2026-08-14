import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyB2bPalletAccessToken } from "@/lib/b2b-pallet-access-tokens";

export type ProducerShareSignupContext = {
  producerId: string;
  shipmentId: string;
  producerName: string;
  email: string | null;
};

function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) return null;
  return email;
}

export async function getProducerShareSignupContext(
  rawToken: string,
): Promise<ProducerShareSignupContext | null> {
  const grant = await verifyB2bPalletAccessToken(rawToken);
  if (!grant) return null;

  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("producers")
    .select("id, name, contact_email")
    .eq("id", grant.producerId)
    .maybeSingle();

  if (!data) return null;

  return {
    producerId: grant.producerId,
    shipmentId: grant.shipmentId,
    producerName: data.name?.trim() || "Producer",
    email: normalizeEmail(data.contact_email as string | null),
  };
}

/**
 * If the logged-in email matches this producer's contact email, link the
 * profile so they can act on pallet status.
 */
export async function linkProducerProfileIfEmailMatches(opts: {
  userId: string;
  userEmail: string;
  producerId: string;
}): Promise<boolean> {
  const userEmail = normalizeEmail(opts.userEmail);
  if (!userEmail) return false;

  const sb = getSupabaseAdmin();
  const { data: producer } = await sb
    .from("producers")
    .select("contact_email")
    .eq("id", opts.producerId)
    .maybeSingle();

  const contactEmail = normalizeEmail(producer?.contact_email as string | null);
  if (!contactEmail || contactEmail !== userEmail) return false;

  const { data: profile } = await sb
    .from("profiles")
    .select("id, producer_id, role, roles")
    .eq("id", opts.userId)
    .maybeSingle();

  if (!profile) return false;
  if (profile.producer_id === opts.producerId) return true;
  if (profile.producer_id && profile.producer_id !== opts.producerId) {
    return false;
  }

  const { data: taken } = await sb
    .from("profiles")
    .select("id")
    .eq("producer_id", opts.producerId)
    .neq("id", opts.userId)
    .maybeSingle();

  if (taken) return false;

  const roles = Array.isArray(profile.roles) ? [...profile.roles] : [];
  if (!roles.includes("producer")) roles.push("producer");
  if (!roles.includes("user")) roles.unshift("user");

  const { error } = await sb
    .from("profiles")
    .update({
      producer_id: opts.producerId,
      role: profile.role === "admin" ? "admin" : "producer",
      roles,
    })
    .eq("id", opts.userId);

  if (error) {
    console.error("[linkProducerProfileIfEmailMatches]", error);
    return false;
  }

  return true;
}
