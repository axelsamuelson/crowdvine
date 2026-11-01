import type { SupabaseClient } from "@supabase/supabase-js";

export type B2bInquiryPrefill = {
  companyName: string;
  organizationNumber: string;
  contactName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  postalCode: string;
};

/**
 * Prefill inquiry fields from the signed-in profile and optional
 * invoice_recipients row linked via profile_id (company/org).
 */
export async function loadB2bInquiryPrefill(
  sb: SupabaseClient,
  user: { id: string; email?: string | null },
): Promise<B2bInquiryPrefill> {
  const empty: B2bInquiryPrefill = {
    companyName: "",
    organizationNumber: "",
    contactName: "",
    email: (user.email ?? "").trim(),
    phone: "",
    deliveryAddress: "",
    postalCode: "",
  };

  const { data: profile } = await sb
    .from("profiles")
    .select("full_name, email, phone, address, postal_code")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    empty.contactName = String(profile.full_name ?? "").trim();
    empty.email = String(profile.email ?? "").trim() || empty.email;
    empty.phone = String(profile.phone ?? "").trim();
    empty.deliveryAddress = String(profile.address ?? "").trim();
    empty.postalCode = String(profile.postal_code ?? "").trim();
  }

  const { data: recipient } = await sb
    .from("invoice_recipients")
    .select(
      `
      company_name,
      org_number,
      contact_name,
      email,
      delivery_address,
      delivery_postal_code,
      address,
      postal_code,
      invoice_recipient_contacts (
        name,
        email,
        phone,
        is_primary
      )
    `,
    )
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recipient) {
    empty.companyName =
      String(recipient.company_name ?? "").trim() || empty.companyName;
    empty.organizationNumber =
      String(recipient.org_number ?? "").trim() || empty.organizationNumber;
    empty.contactName =
      String(recipient.contact_name ?? "").trim() || empty.contactName;
    empty.email = String(recipient.email ?? "").trim() || empty.email;
    empty.deliveryAddress =
      String(recipient.delivery_address ?? "").trim() ||
      String(recipient.address ?? "").trim() ||
      empty.deliveryAddress;
    empty.postalCode =
      String(recipient.delivery_postal_code ?? "").trim() ||
      String(recipient.postal_code ?? "").trim() ||
      empty.postalCode;

    const contacts = Array.isArray(recipient.invoice_recipient_contacts)
      ? recipient.invoice_recipient_contacts
      : [];
    const primary =
      contacts.find((c: { is_primary?: boolean }) => c.is_primary) ??
      contacts[0];
    if (primary) {
      empty.contactName =
        String(primary.name ?? "").trim() || empty.contactName;
      empty.email = String(primary.email ?? "").trim() || empty.email;
      empty.phone = String(primary.phone ?? "").trim() || empty.phone;
    }
  }

  return empty;
}
