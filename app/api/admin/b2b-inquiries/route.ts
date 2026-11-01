import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";

export async function GET() {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("b2b_inquiries")
    .select(
      `
      id,
      created_at,
      updated_at,
      status,
      company_name,
      organization_number,
      contact_name,
      email,
      phone,
      delivery_address,
      postal_code,
      desired_delivery_date,
      message,
      reviewed_at,
      reviewed_by,
      b2b_inquiry_lines (
        id,
        wine_id,
        wine_title,
        quantity,
        unit_price_cents
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin/b2b-inquiries] list:", error.message);
    return NextResponse.json(
      { error: "Failed to list inquiries" },
      { status: 500 },
    );
  }

  return NextResponse.json({ inquiries: data ?? [] });
}
