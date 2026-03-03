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
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("invoice_recipients")
      .select("id, created_at, updated_at, profile_id, company_name, contact_name, email, address, postal_code, city, org_number")
      .eq("id", id)
      .single();

    if (error || !data) {
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
 * Body: { company_name?, contact_name?, email?, address?, profile_id? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.company_name !== undefined) updates.company_name = String(body.company_name).trim() || "";
    if (body.contact_name !== undefined) updates.contact_name = String(body.contact_name).trim() || "";
    if (body.email !== undefined) updates.email = String(body.email).trim() || "";
    if (body.address !== undefined) updates.address = String(body.address).trim() || "";
    if (body.postal_code !== undefined) updates.postal_code = String(body.postal_code).trim() || "";
    if (body.city !== undefined) updates.city = String(body.city).trim() || "";
    if (body.profile_id !== undefined) updates.profile_id = body.profile_id && typeof body.profile_id === "string" ? body.profile_id : null;
    if (body.org_number !== undefined) updates.org_number = String(body.org_number).trim() || "";

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("invoice_recipients")
      .update(updates)
      .eq("id", id)
      .select("id, created_at, updated_at, profile_id, company_name, contact_name, email, address, postal_code, city, org_number")
      .single();

    if (error) {
      console.error("Error updating invoice recipient:", error);
      return NextResponse.json(
        { error: "Failed to update invoice recipient", details: error.message },
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
