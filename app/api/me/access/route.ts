import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ access: false });
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("access_granted_at")
      .eq("id", user.id)
      .single();

    const has = !!prof?.access_granted_at;

    return NextResponse.json({ access: has });
  } catch (error) {
    console.error("Error checking access:", error);
    return NextResponse.json({ access: false });
  }
}
