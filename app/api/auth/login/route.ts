import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generalLimiter, getClientIdentifier } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  // Rate limiting
  const identifier = getClientIdentifier(req);
  if (!generalLimiter.isAllowed(identifier)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Please try again later." },
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

  const { email, password } = await req.json();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error)
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 },
    );

  return NextResponse.json({
    ok: true,
    user: { id: data.user?.id, email: data.user?.email },
  });
}
