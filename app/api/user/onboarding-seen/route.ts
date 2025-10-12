import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Check if user has seen onboarding
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("onboarding_seen")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching onboarding status:", error);
      return NextResponse.json(
        { error: "Failed to fetch onboarding status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      onboardingSeen: profile?.onboarding_seen || false 
    });
  } catch (error) {
    console.error("Error in GET /api/user/onboarding-seen:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Mark onboarding as seen
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_seen: true })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating onboarding status:", error);
      return NextResponse.json(
        { error: "Failed to update onboarding status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/user/onboarding-seen:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

