import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SENDER_DEFAULTS_ID = "00000000-0000-0000-0000-000000000001";

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (admin) return;
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const sb = getSupabaseAdmin();
  const { data: profile } = await sb
    .from("profiles")
    .select("roles, role")
    .eq("id", user.id)
    .single();
  const isAdmin =
    profile?.roles?.includes("admin") ||
    profile?.role === "admin" ||
    (user as { roles?: string[]; role?: string }).roles?.includes("admin") ||
    (user as { role?: string }).role === "admin";
  if (!isAdmin) throw new Error("Admin access required");
}

export interface InvoiceSenderDefaults {
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
}

/**
 * GET /api/admin/invoice-sender-defaults
 * Returns the single row of sender defaults for pre-filling invoices.
 */
export async function GET() {
  try {
    await requireAdmin();
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("invoice_sender_defaults")
      .select(
        "company_name, company_logo, company_details, org_number, vat_number, from_name, from_email, from_address, from_postal_code, from_city, from_country, clearing_number, account_number, payment_terms, default_footer",
      )
      .eq("id", SENDER_DEFAULTS_ID)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching invoice sender defaults:", error);
      return NextResponse.json(
        { error: "Failed to fetch", details: error.message },
        { status: 500 },
      );
    }

    const out: InvoiceSenderDefaults = {
      company_name: data?.company_name ?? "",
      company_logo: data?.company_logo ?? "",
      company_details: data?.company_details ?? "",
      org_number: data?.org_number ?? "",
      vat_number: data?.vat_number ?? "",
      from_name: data?.from_name ?? "",
      from_email: data?.from_email ?? "",
      from_address: data?.from_address ?? "",
      from_postal_code: data?.from_postal_code ?? "",
      from_city: data?.from_city ?? "",
      from_country: data?.from_country ?? "",
      clearing_number: data?.clearing_number ?? "",
      account_number: data?.account_number ?? "",
      payment_terms: data?.payment_terms ?? "",
      default_footer: data?.default_footer ?? "",
    };
    return NextResponse.json(out);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/invoice-sender-defaults
 * Body: InvoiceSenderDefaults (all optional)
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as Partial<InvoiceSenderDefaults>;
    const sb = getSupabaseAdmin();

    const updates = {
      updated_at: new Date().toISOString(),
      company_name: String(body.company_name ?? "").trim(),
      company_logo: String(body.company_logo ?? "").trim(),
      company_details: String(body.company_details ?? "").trim(),
      org_number: String(body.org_number ?? "").trim(),
      vat_number: String(body.vat_number ?? "").trim(),
      from_name: String(body.from_name ?? "").trim(),
      from_email: String(body.from_email ?? "").trim(),
      from_address: String(body.from_address ?? "").trim(),
      from_postal_code: String(body.from_postal_code ?? "").trim(),
      from_city: String(body.from_city ?? "").trim(),
      from_country: String(body.from_country ?? "").trim(),
      clearing_number: String(body.clearing_number ?? "").trim(),
      account_number: String(body.account_number ?? "").trim(),
      payment_terms: String(body.payment_terms ?? "").trim(),
      default_footer: String(body.default_footer ?? "").trim(),
    };

    const { error } = await sb
      .from("invoice_sender_defaults")
      .upsert({ id: SENDER_DEFAULTS_ID, ...updates }, { onConflict: "id" });

    if (error) {
      console.error("Error updating invoice sender defaults:", error);
      return NextResponse.json(
        { error: "Failed to save", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(updates);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
