import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logUserEventServer } from "@/lib/analytics/log-user-event-server";
import { isGuestCheckoutEnabled } from "@/lib/checkout/guest-checkout-flag";
import {
  NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
  NEW_PALLET_OPEN_PURPOSE,
  createUnsubscribeToken,
} from "@/lib/marketing/new-pallet-open-consent";

/**
 * POST /api/checkout/claim-guest-account
 *
 * Optional confirmation-page account claim for guest checkout identities.
 * Consent (marketingOptIn) is never assumed — client must send explicit true.
 * Requires GUEST_CHECKOUT_ENABLED (reads guest_checkout_at / account_claimed_at
 * — columns from migration 291; must not run when flag is OFF).
 */
export async function POST(request: NextRequest) {
  if (!isGuestCheckoutEnabled()) {
    return NextResponse.json(
      { error: "Guest account claim is not available." },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    marketingOptIn?: unknown;
    reservationId?: unknown;
  } | null;

  const marketingOptIn = body?.marketingOptIn === true;
  const reservationId =
    typeof body?.reservationId === "string" ? body.reservationId.trim() : null;

  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: profile, error: profileReadError } = await sb
    .from("profiles")
    .select("id, guest_checkout_at, account_claimed_at, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError) {
    console.error("[claim-guest-account] profile read:", profileReadError);
    return NextResponse.json(
      { error: "Could not load profile." },
      { status: 500 },
    );
  }

  if (!profile?.guest_checkout_at) {
    return NextResponse.json(
      { error: "Not a guest checkout profile." },
      { status: 400 },
    );
  }

  if (profile.account_claimed_at) {
    return NextResponse.json({
      ok: true,
      alreadyClaimed: true,
      accountClaimedAt: profile.account_claimed_at,
    });
  }

  const { error: updateError } = await sb
    .from("profiles")
    .update({
      account_claimed_at: now,
      updated_at: now,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("[claim-guest-account] update:", updateError);
    return NextResponse.json(
      { error: "Could not claim account." },
      { status: 500 },
    );
  }

  if (marketingOptIn) {
    const emailRaw = (profile.email || user.email || "")
      .trim()
      .toLowerCase();
    if (emailRaw.includes("@")) {
      const { data: existing } = await sb
        .from("marketing_consents")
        .select("id")
        .eq("purpose", NEW_PALLET_OPEN_PURPOSE)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await sb
          .from("marketing_consents")
          .update({
            email: emailRaw,
            text_version_id: NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
            consented_at: now,
            withdrawn_at: null,
            updated_at: now,
          })
          .eq("id", existing.id);
      } else {
        await sb.from("marketing_consents").insert({
          user_id: user.id,
          email: emailRaw,
          purpose: NEW_PALLET_OPEN_PURPOSE,
          text_version_id: NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
          consented_at: now,
          unsubscribe_token: createUnsubscribeToken(),
        });
      }
    }
  }

  void logUserEventServer({
    userId: user.id,
    eventType: "account_created_from_confirmation",
    eventCategory: "account",
    metadata: {
      marketing_opt_in: marketingOptIn,
      ...(reservationId ? { reservation_id: reservationId } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    alreadyClaimed: false,
    accountClaimedAt: now,
    marketingOptIn,
  });
}
