import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get the current authenticated user
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: "Not authenticated",
        debug: "No user found in getCurrentUser()"
      }, { status: 401 });
    }
    
    console.log(`Debug: Fetching reservations for user: ${user.id} (${user.email})`);
    
    // Get all reservations (for debugging)
    const { data: allReservations, error: allError } = await supabase
      .from('order_reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      return NextResponse.json({ 
        error: "Failed to fetch all reservations",
        details: allError.message
      }, { status: 500 });
    }

    // Get user-specific reservations
    const { data: userReservations, error: userError } = await supabase
      .from('order_reservations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (userError) {
      return NextResponse.json({ 
        error: "Failed to fetch user reservations",
        details: userError.message
      }, { status: 500 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      debug: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          producer_id: user.producer_id
        },
        profile: profile || null,
        profileError: profileError?.message || null,
        allReservationsCount: allReservations?.length || 0,
        userReservationsCount: userReservations?.length || 0,
        allReservations: allReservations?.slice(0, 5) || [], // First 5 for debugging
        userReservations: userReservations || []
      }
    });

  } catch (error) {
    console.error('Debug reservations API error:', error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
