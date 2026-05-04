import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateEligibleGeoZoneId } from "@/lib/market/validate-eligible-geo-zone";
import { signupLimiter, getClientIdentifier } from "@/lib/rate-limiter";

/**
 * Invitation signups should use POST /api/invitations/redeem in the app.
 * If `invitation_code` is sent here, `activeGeoZoneId` is required (same validation as redeem).
 */
export async function POST(req: Request) {
  // Rate limiting för signup (striktare)
  const identifier = getClientIdentifier(req);
  if (!signupLimiter.isAllowed(identifier)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Too many signup attempts. Please try again later.",
      },
      { status: 429 },
    );
  }

  // Origin-kontroll för säkerhet (temporarily disabled for debugging)
  // const origin = req.headers.get("origin");
  // if (process.env.NODE_ENV === "production") {
  //   const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  //   // Allow requests from the main domain and development subdomain
  //   const allowedOrigins = [
  //     appUrl,
  //     "https://pactwines.com",
  //     "https://www.pactwines.com",
  //     "https://dev.pactwines.com"
  //   ];
  //
  //   if (!origin || !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
  //     console.log("Origin check failed:", { origin, appUrl, allowedOrigins });
  //     return NextResponse.json(
  //       { ok: false, message: "Bad origin" },
  //       { status: 403 },
  //     );
  //   }
  // }

  const body = await req.json();
  const { email, password, full_name } = body;
  const invitation_code = body.invitation_code
    ? String(body.invitation_code).trim().toUpperCase()
    : "";
  const activeGeoZoneIdRaw = body.activeGeoZoneId ?? body.active_geo_zone_id;
  const activeGeoZoneId =
    typeof activeGeoZoneIdRaw === "string" ? activeGeoZoneIdRaw.trim() : "";

  const supabase = createSupabaseServerClient();

  if (invitation_code) {
    if (!activeGeoZoneId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Wine zone is required (activeGeoZoneId)",
        },
        { status: 400 },
      );
    }

    const sbAdmin = getSupabaseAdmin();
    const geoGate = await validateEligibleGeoZoneId(sbAdmin, activeGeoZoneId);
    if (!geoGate.ok) {
      return NextResponse.json(
        { ok: false, message: geoGate.message },
        { status: geoGate.status },
      );
    }

    const { data: invite } = await supabase
      .from("invitation_codes")
      .select("code, used_at")
      .eq("code", invitation_code)
      .maybeSingle();
    if (!invite || invite.used_at) {
      return NextResponse.json(
        { ok: false, message: "Invalid or used invitation code" },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error)
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 },
    );

  // Create profile with access granted for invitation signups
  const profileData: any = {
    id: data.user?.id,
    full_name,
  };

  if (invitation_code) {
    profileData.access_granted_at = new Date().toISOString();
    profileData.invite_code_used = invitation_code;
  }

  await supabase.from("profiles").insert(profileData);

  if (invitation_code && data.user?.id) {
    const sbAdmin = getSupabaseAdmin();
    const { error: zonePrefError } = await sbAdmin
      .from("user_zone_preferences")
      .upsert(
        {
          user_id: data.user.id,
          active_geo_zone_id: activeGeoZoneId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (zonePrefError) {
      console.error("[auth/signup] user_zone_preferences upsert:", zonePrefError);
      return NextResponse.json(
        {
          ok: false,
          message: "Failed to save wine zone preference",
          details: zonePrefError.message,
        },
        { status: 500 },
      );
    }

    await supabase
      .from("invitation_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code", invitation_code);
  }

  // Automatically sign in the user after successful signup
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError) {
    // If auto sign-in fails, still return success but user will need to sign in manually
    console.error("Auto sign-in failed:", signInError);
    return NextResponse.json({
      ok: true,
      user: { id: data.user?.id, email: data.user?.email },
      autoSignedIn: false,
      message: "Account created successfully. Please sign in.",
    });
  }

  // CRITICAL SECURITY: Verify that the signed-in user matches the created user
  if (signInData.user?.id !== data.user?.id) {
    console.error(
      "SECURITY ALERT: Signed-in user ID does not match created user ID!",
    );
    console.error("Created user ID:", data.user?.id);
    console.error("Signed-in user ID:", signInData.user?.id);

    // Sign out immediately for security
    await supabase.auth.signOut({ scope: "global" });

    return NextResponse.json(
      {
        ok: false,
        error: "Security validation failed. Please try signing in manually.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: { id: signInData.user?.id, email: signInData.user?.email },
    autoSignedIn: true,
    message: "Account created and signed in successfully.",
  });
}
