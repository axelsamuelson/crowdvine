import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveCompanyOrgNumber,
  resolveCompanyVatNumber,
} from "@/lib/invoice-sender-constants";

const SENDER_DEFAULTS_ID = "00000000-0000-0000-0000-000000000001";

const SENDER_COLUMNS = [
  "company_name",
  "company_logo",
  "company_details",
  "org_number",
  "vat_number",
  "from_name",
  "from_email",
  "from_address",
  "from_postal_code",
  "from_city",
  "from_country",
  "clearing_number",
  "account_number",
  "payment_terms",
  "default_footer",
] as const;

export type InvoiceSenderDefaults = {
  company_name: string;
  company_logo: string;
  company_details: string;
  org_number: string;
  vat_number: string;
  from_name: string;
  from_email: string;
  from_address: string;
  from_postal_code: string;
  from_city: string;
  from_country: string;
  clearing_number: string;
  account_number: string;
  payment_terms: string;
  default_footer: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function text(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

/** The single sender row used when a draft has not frozen a snapshot yet. */
export async function loadInvoiceSenderDefaults(
  sb: SupabaseClient,
): Promise<InvoiceSenderDefaults | null> {
  const { data, error } = await sb
    .from("invoice_sender_defaults")
    .select(SENDER_COLUMNS.join(", "))
    .eq("id", SENDER_DEFAULTS_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = asRecord(data);
  if (!row) return null;
  return {
    company_name: text(row, "company_name"),
    company_logo: text(row, "company_logo"),
    company_details: text(row, "company_details"),
    org_number: resolveCompanyOrgNumber(text(row, "org_number")),
    vat_number: resolveCompanyVatNumber(text(row, "vat_number")),
    from_name: text(row, "from_name"),
    from_email: text(row, "from_email"),
    from_address: text(row, "from_address"),
    from_postal_code: text(row, "from_postal_code"),
    from_city: text(row, "from_city"),
    from_country: text(row, "from_country"),
    clearing_number: text(row, "clearing_number"),
    account_number: text(row, "account_number"),
    payment_terms: text(row, "payment_terms"),
    default_footer: text(row, "default_footer"),
  };
}
