import { NextRequest, NextResponse } from "next/server";
import { previewOutboundFreight } from "@/lib/admin/lager-frakt-reads";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  loadActiveBudbeeLightSwedenRate,
  loadDefaultPackagingProfile,
} from "@/lib/outbound-freight-quotes";

/** Admin diagnostic + catalogue inspect for outbound Instabee. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sb = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const checkoutGroupId = searchParams.get("checkout_group_id");
    const quoteId = searchParams.get("quote_id");

    const catalogue = await loadActiveBudbeeLightSwedenRate();
    const packaging = await loadDefaultPackagingProfile();

    let quote = null;
    if (quoteId) {
      const { data } = await sb
        .from("outbound_freight_quotes")
        .select("*")
        .eq("id", quoteId)
        .maybeSingle();
      quote = data;
    } else if (checkoutGroupId) {
      const { data } = await sb
        .from("outbound_freight_quotes")
        .select("*")
        .eq("checkout_group_id", checkoutGroupId)
        .maybeSingle();
      quote = data;
    }

    return NextResponse.json({
      catalogue,
      packaging,
      quote,
      note: "Customer shipping revenue ≠ Instabee carrier cost",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

/** Preview calculator — does not persist. */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const breakdown = previewOutboundFreight(body);
    return NextResponse.json({ breakdown });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
