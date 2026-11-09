import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
  NEW_PALLET_OPEN_PURPOSE,
  createUnsubscribeToken,
} from "@/lib/marketing/new-pallet-open-consent";

/**
 * Toggle new-pallet-open marketing consent for the signed-in user.
 * Checked → insert/reactivate; unchecked → set withdrawn_at.
 * Does not send email.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { optedIn?: unknown; email?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const optedIn = body.optedIn === true;
  const emailRaw =
    typeof body.email === "string" && body.email.includes("@")
      ? body.email.trim().toLowerCase()
      : (user.email ?? "").trim().toLowerCase();
  if (!emailRaw.includes("@")) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  if (!optedIn) {
    const { error } = await sb
      .from("marketing_consents")
      .update({
        withdrawn_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("purpose", NEW_PALLET_OPEN_PURPOSE)
      .eq("user_id", user.id)
      .is("withdrawn_at", null);
    if (error) {
      return NextResponse.json({ error: "withdraw_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, optedIn: false });
  }

  // Reactivate existing withdrawn row for this user+purpose, else insert.
  const { data: existing } = await sb
    .from("marketing_consents")
    .select("id, withdrawn_at, unsubscribe_token")
    .eq("purpose", NEW_PALLET_OPEN_PURPOSE)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await sb
      .from("marketing_consents")
      .update({
        email: emailRaw,
        text_version_id: NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
        consented_at: new Date().toISOString(),
        withdrawn_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      optedIn: true,
      text_version_id: NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
    });
  }

  const token = createUnsubscribeToken();
  const { error: insErr } = await sb.from("marketing_consents").insert({
    user_id: user.id,
    email: emailRaw,
    purpose: NEW_PALLET_OPEN_PURPOSE,
    text_version_id: NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
    unsubscribe_token: token,
  });
  if (insErr) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    optedIn: true,
    text_version_id: NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
  });
}
