import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error)
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
