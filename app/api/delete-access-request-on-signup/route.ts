import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();

    // Delete the access request for this email
    const { error } = await adminSupabase
      .from('access_requests')
      .delete()
      .eq('email', email);

    if (error) {
      console.error('Error deleting access request:', error);
      // Don't fail the signup process if this fails
      console.log('Continuing signup despite access request deletion error');
    } else {
      console.log('Access request deleted for:', email);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete access request on signup API error:', error);
    // Don't fail the signup process
    return NextResponse.json({ success: true });
  }
}
