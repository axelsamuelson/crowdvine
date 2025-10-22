import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();

  try {
    // Cohort analysis by signup week
    const { data, error } = await sb.rpc("get_cohort_analysis");

    if (error) throw error;
    return NextResponse.json({ cohorts: data });
  } catch (error) {
    console.error("Cohort analysis error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cohort data" },
      { status: 500 }
    );
  }
}
