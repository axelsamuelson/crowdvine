import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";

const STATUSES = new Set(["new", "confirmed", "rejected"]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (typeof status !== "string" || !STATUSES.has(status)) {
    return NextResponse.json(
      { error: "status must be new|confirmed|rejected" },
      { status: 400 },
    );
  }

  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("b2b_inquiries")
    .update({
      status,
      updated_at: now,
      reviewed_at: now,
      reviewed_by: adminAuth.id,
    })
    .eq("id", id)
    .select(
      `
      id,
      status,
      updated_at,
      reviewed_at,
      reviewed_by
    `,
    )
    .single();

  if (error) {
    console.error("[admin/b2b-inquiries] patch:", error.message);
    return NextResponse.json(
      { error: "Failed to update inquiry" },
      { status: 500 },
    );
  }

  return NextResponse.json({ inquiry: data });
}
