import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get all discount codes
    const { data: discountCodes, error } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discount codes:', error);
      return NextResponse.json({ error: "Failed to fetch discount codes" }, { status: 500 });
    }

    // Also get recent invitation usage
    const { data: recentInvitations, error: invitationError } = await supabase
      .from('invitation_codes')
      .select('id, code, current_uses, used_at, used_by, created_by')
      .gt('current_uses', 0)
      .order('used_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      discountCodes: discountCodes || [],
      recentInvitations: recentInvitations || [],
      totalDiscountCodes: discountCodes?.length || 0,
      totalUsedInvitations: recentInvitations?.length || 0
    });

  } catch (error) {
    console.error('Debug discount codes error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
