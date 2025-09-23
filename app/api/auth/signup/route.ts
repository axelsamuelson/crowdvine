import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signupLimiter, getClientIdentifier } from "@/lib/rate-limiter";

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

  // Origin-kontroll för säkerhet
  const origin = req.headers.get("origin");
  if (process.env.NODE_ENV === "production") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    // Allow requests from the main domain and development subdomain
    const allowedOrigins = [
      appUrl,
      "https://pactwines.com",
      "https://www.pactwines.com",
      "https://dev.pactwines.com"
    ];
    
    if (!origin || !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      console.log("Origin check failed:", { origin, appUrl, allowedOrigins });
      return NextResponse.json(
        { ok: false, message: "Bad origin" },
        { status: 403 },
      );
    }
  }

  const { email, password, full_name, invitation_code } = await req.json();
  const supabase = createSupabaseServerClient();

  if (invitation_code) {
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

  await supabase.from("profiles").insert({
    id: data.user?.id,
    full_name,
    // access_granted_at: null (pending) eller sätt direkt om ni auto-grantar
  });

  if (invitation_code) {
    await supabase
      .from("invitation_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code", invitation_code);
  }

  return NextResponse.json({
    ok: true,
    user: { id: data.user?.id, email: data.user?.email },
  });
}
