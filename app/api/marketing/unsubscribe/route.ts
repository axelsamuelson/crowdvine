import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NEW_PALLET_OPEN_PURPOSE } from "@/lib/marketing/new-pallet-open-consent";

export const runtime = "nodejs";

/**
 * One-click unsubscribe for new-pallet-opening marketing mail.
 * Does not send email — only sets withdrawn_at.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = String(url.searchParams.get("token") ?? "").trim();
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("marketing_consents")
    .select("id, email, purpose, withdrawn_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!data || data.purpose !== NEW_PALLET_OPEN_PURPOSE) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (data.withdrawn_at) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error: updErr } = await sb
    .from("marketing_consents")
    .update({
      withdrawn_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id)
    .is("withdrawn_at", null);

  if (updErr) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, already: false });
}
