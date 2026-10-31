import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/exit-feedback/status
 * Returns whether the logged-in profile has already answered exit feedback.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ answered: false, authenticated: false });
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("profiles")
      .select("exit_feedback_answered_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[exit-feedback/status] lookup failed");
      return NextResponse.json({ answered: false, authenticated: true });
    }

    return NextResponse.json({
      answered: data?.exit_feedback_answered_at != null,
      authenticated: true,
    });
  } catch {
    return NextResponse.json({ answered: false, authenticated: false });
  }
}
