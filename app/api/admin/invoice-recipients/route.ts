import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { listInvoiceRecipients, saveInvoiceRecipient } from "@/lib/invoices/recipients";
import type { InvoiceRecipientRecord } from "@/lib/invoices/schemas";

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

export type InvoiceRecipient = InvoiceRecipientRecord;

/**
 * GET /api/admin/invoice-recipients
 * List all invoice recipients (companies) for dropdown when creating invoices.
 */
export async function GET() {
  try {
    await requireAdmin();
    const data = await listInvoiceRecipients(getSupabaseAdmin());
    return NextResponse.json(data);
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
    const data = await saveInvoiceRecipient(getSupabaseAdmin(), {
      company_name: typeof body.company_name === "string" ? body.company_name : "",
      email: typeof body.email === "string" ? body.email : "",
      address: typeof body.address === "string" ? body.address : "",
      postal_code: typeof body.postal_code === "string" ? body.postal_code : "",
      city: typeof body.city === "string" ? body.city : "",
      org_number: typeof body.org_number === "string" ? body.org_number : "",
      profile_id: typeof body.profile_id === "string" ? body.profile_id : null,
      contacts: Array.isArray(body.contacts) ? body.contacts : [],
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
