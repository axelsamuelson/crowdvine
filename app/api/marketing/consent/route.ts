import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isGuestCheckoutEnabled } from "@/lib/checkout/guest-checkout-flag";
import {
  NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
  NEW_PALLET_OPEN_PURPOSE,
  createUnsubscribeToken,
} from "@/lib/marketing/new-pallet-open-consent";

/**
 * Toggle new-pallet-open marketing consent.
 * Consent is stored independently of whether the shopper has a claimed account:
 * - Signed-in (including unclaimed guest identity from ensure-session): by user_id
 * - Guest flag ON + valid email, no session yet: email-only row (user_id null)
 * Does not send email.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const guestCheckoutEnabled = isGuestCheckoutEnabled();

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
      : (user?.email ?? "").trim().toLowerCase();
  if (!emailRaw.includes("@")) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  if (!user?.id && !guestCheckoutEnabled) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (!optedIn) {
    let q = sb
      .from("marketing_consents")
      .update({
        withdrawn_at: now,
        updated_at: now,
      })
      .eq("purpose", NEW_PALLET_OPEN_PURPOSE)
      .is("withdrawn_at", null);
    if (user?.id) {
      q = q.eq("user_id", user.id);
    } else {
      q = q.eq("email", emailRaw).is("user_id", null);
    }
    const { error } = await q;
    if (error) {
      return NextResponse.json({ error: "withdraw_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, optedIn: false });
  }

  // Prefer an existing row for this user, else email-only row for guests.
  let existing: { id: string } | null = null;
  if (user?.id) {
    const { data } = await sb
      .from("marketing_consents")
      .select("id, withdrawn_at, unsubscribe_token")
      .eq("purpose", NEW_PALLET_OPEN_PURPOSE)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existing = data?.id ? { id: data.id } : null;
  }
  if (!existing) {
    const { data } = await sb
      .from("marketing_consents")
      .select("id")
      .eq("purpose", NEW_PALLET_OPEN_PURPOSE)
      .eq("email", emailRaw)
      .is("withdrawn_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existing = data?.id ? { id: data.id } : null;
  }

  if (existing?.id) {
    const { error } = await sb
      .from("marketing_consents")
      .update({
        email: emailRaw,
        ...(user?.id ? { user_id: user.id } : {}),
        text_version_id: NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
        consented_at: now,
        withdrawn_at: null,
        updated_at: now,
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
    user_id: user?.id ?? null,
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
