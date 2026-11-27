import { NextResponse } from "next/server";

import { SHIP_TO_COOKIE } from "@/lib/checkout/ship-to-gate";
import { normalizeCountryCode } from "@/lib/market/country-registry";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    countryCode?: string;
  } | null;
  const countryCode = normalizeCountryCode(body?.countryCode);
  if (!countryCode) {
    return NextResponse.json({ error: "Invalid country" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, countryCode });
  response.cookies.set(SHIP_TO_COOKIE, countryCode, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  const user = await getCurrentUser().catch(() => null);
  if (user?.id) {
    try {
      const sb = getSupabaseAdmin();
      await sb
        .from("profiles")
        .update({ ship_to_country_code: countryCode })
        .eq("id", user.id);
    } catch (error) {
      console.warn("[ship-to] profile:", error);
    }
  }

  return response;
}
