import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/user/wine-identity
 *
 * Returns current user's wine identity preferences
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    // Get wine identity from profile
    const { data: profile, error } = await sb
      .from("profiles")
      .select("wine_identity")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({
      wineIdentity: profile?.wine_identity || null,
    });
  } catch (error) {
    console.error("Error fetching wine identity:", error);
    return NextResponse.json(
      { error: "Failed to fetch wine identity" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/user/wine-identity
 *
 * Save user's wine identity preferences
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const body = await request.json();

    const { preferences } = body;

    // Update profile with wine identity
    const { data, error } = await sb
      .from("profiles")
      .update({
        wine_identity: preferences,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    return NextResponse.json({ 
      wineIdentity: data.wine_identity,
      success: true 
    });
  } catch (error: any) {
    console.error("Error saving wine identity:", error);
    return NextResponse.json(
      { 
        error: "Failed to save wine identity",
        details: error?.message || "Unknown error"
      },
      { status: 500 },
    );
  }
}




