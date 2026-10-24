import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { listEnrichedPactPallets } from "@/lib/admin/pact-pallet-list";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    await requireAdmin();
    const sb = getSupabaseAdmin();
    const rows = await listEnrichedPactPallets(sb);
    return NextResponse.json(rows);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    if (msg.includes("Admin authentication")) {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("Unexpected error in pallets API:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const body = await request.json();

  const { data, error } = await sb
    .from("pallets")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
