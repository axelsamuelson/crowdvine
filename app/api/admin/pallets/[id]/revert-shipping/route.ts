import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";

function normalizeStatus(s: string | null | undefined): string {
  return String(s ?? "").toLowerCase().trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = request.cookies.get("admin-auth")?.value;
  if (adminAuth !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: palletId } = await params;
  if (!palletId || typeof palletId !== "string") {
    return NextResponse.json({ error: "Missing pallet id" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  try {
    const user = await getCurrentUser();
    console.log(
      `[revert-shipping] POST pallet=${palletId} adminUserId=${user?.id ?? "null"}`,
    );

    const { data: pallet, error: loadErr } = await sb
      .from("pallets")
      .select("id, status")
      .eq("id", palletId)
      .maybeSingle();

    if (loadErr) {
      console.error("[revert-shipping] load pallet:", loadErr.message);
      return NextResponse.json({ error: loadErr.message }, { status: 500 });
    }

    if (!pallet?.id) {
      return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
    }

    const st = normalizeStatus(pallet.status as string | null);
    if (st !== "shipping_ordered") {
      return NextResponse.json(
        { error: "Pallet is not in shipping_ordered status" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await sb
      .from("pallets")
      .update({
        status: "open",
        shipping_ordered_at: null,
        shipping_ordered_by: null,
        updated_at: now,
      })
      .eq("id", palletId)
      .eq("status", "shipping_ordered")
      .select("id, status")
      .maybeSingle();

    if (updateErr) {
      console.error("[revert-shipping] update:", updateErr.message);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Pallet is not in shipping_ordered status" },
        { status: 400 },
      );
    }

    console.log(
      `[revert-shipping] reverted pallet=${palletId} to open adminUserId=${user?.id ?? "null"}`,
    );

    return NextResponse.json({
      success: true,
      palletId,
      status: "open",
    });
  } catch (e) {
    console.error("[revert-shipping]", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
