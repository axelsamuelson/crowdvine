import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client for user authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get user's used invitations
    const { data: usedInvitations, error } = await supabase
      .from('invitation_codes')
      .select('code, used_at, used_by, current_uses, created_at')
      .eq('created_by', user.id)
      .gt('current_uses', 0)
      .order('used_at', { ascending: false });

    if (error) {
      console.error('Error fetching used invitations:', error);
      return NextResponse.json({ error: "Failed to fetch used invitations" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      usedInvitations: usedInvitations || []
    });

  } catch (error) {
    console.error('Used invitations API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
