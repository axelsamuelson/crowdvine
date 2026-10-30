import { NextResponse } from "next/server";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;
  const sb = getSupabaseAdmin();

  try {
    const { data: wineBoxes, error } = await sb
      .from("wine_boxes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(wineBoxes || []);
  } catch (error) {
    console.error("Error fetching wine boxes:", error);
    return NextResponse.json(
      { error: "Failed to fetch wine boxes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;
  const sb = getSupabaseAdmin();

  try {
    const body = await request.json();

    const { data, error } = await sb
      .from("wine_boxes")
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating wine box:", error);
    return NextResponse.json(
      { error: "Failed to create wine box" },
      { status: 500 },
    );
  }
}
