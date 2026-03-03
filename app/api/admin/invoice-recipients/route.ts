import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

export interface InvoiceRecipient {
  id: string;
  created_at: string;
  updated_at: string;
  profile_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  address: string;
  postal_code?: string;
  city?: string;
  org_number?: string;
}

/**
 * GET /api/admin/invoice-recipients
 * List all invoice recipients (companies) for dropdown when creating invoices.
 */
export async function GET() {
  try {
    await requireAdmin();
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("invoice_recipients")
      .select("id, created_at, updated_at, profile_id, company_name, contact_name, email, address, postal_code, city, org_number")
      .order("company_name");

    if (error) {
      console.error("Error fetching invoice recipients:", error);
      return NextResponse.json(
        { error: "Failed to fetch invoice recipients", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/invoice-recipients
 * Create a new invoice recipient (company profile).
 * Body: { company_name, contact_name, email, address, profile_id? }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { company_name = "", contact_name = "", email = "", address = "", postal_code = "", city = "", profile_id = null, org_number = "" } = body;

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("invoice_recipients")
      .insert({
        company_name: String(company_name).trim() || "",
        contact_name: String(contact_name).trim() || "",
        email: String(email).trim() || "",
        address: String(address).trim() || "",
        postal_code: String(postal_code).trim() || "",
        city: String(city).trim() || "",
        profile_id: profile_id && typeof profile_id === "string" ? profile_id : null,
        org_number: String(org_number).trim() || "",
      })
      .select("id, created_at, updated_at, profile_id, company_name, contact_name, email, address, postal_code, city, org_number")
      .single();

    if (error) {
      console.error("Error creating invoice recipient:", error);
      return NextResponse.json(
        { error: "Failed to create invoice recipient", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
