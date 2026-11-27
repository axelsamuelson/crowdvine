import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  waitlistCsv,
  type WaitlistSignupRow,
} from "@/lib/waitlist/admin-summary";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("waitlist_signups")
    .select("country_code, cart_snapshot, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    return NextResponse.json({ error: "Could not read waitlist" }, { status: 500 });
  }
  const csv = waitlistCsv((data ?? []) as WaitlistSignupRow[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=waitlist.csv",
    },
  });
}
