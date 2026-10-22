import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getInvoiceRecipient, saveInvoiceRecipient } from "@/lib/invoices/recipients";

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

/**
 * GET /api/admin/invoice-recipients/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await getInvoiceRecipient(getSupabaseAdmin(), id);
    if (!data) {
      return NextResponse.json(
        { error: "Invoice recipient not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PATCH /api/admin/invoice-recipients/[id]
 * Body: company fields and optional contacts[]. Does not write contact_name.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const current = await getInvoiceRecipient(getSupabaseAdmin(), id);
    if (!current) {
      return NextResponse.json({ error: "Invoice recipient not found" }, { status: 404 });
    }
    const data = await saveInvoiceRecipient(getSupabaseAdmin(), {
      id,
      company_name: typeof body.company_name === "string" ? body.company_name : current.company_name,
      email: typeof body.email === "string" ? body.email : current.email,
      address: typeof body.address === "string" ? body.address : current.address,
      postal_code: typeof body.postal_code === "string" ? body.postal_code : current.postal_code,
      city: typeof body.city === "string" ? body.city : current.city,
      org_number: typeof body.org_number === "string" ? body.org_number : current.org_number,
      profile_id: body.profile_id === undefined
        ? current.profile_id
        : typeof body.profile_id === "string"
          ? body.profile_id
          : null,
      contacts: Array.isArray(body.contacts) ? body.contacts : current.contacts,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/invoice-recipients/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const sb = getSupabaseAdmin();
    const { error } = await sb.from("invoice_recipients").delete().eq("id", id);

    if (error) {
      console.error("Error deleting invoice recipient:", error);
      return NextResponse.json(
        { error: "Failed to delete invoice recipient", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
