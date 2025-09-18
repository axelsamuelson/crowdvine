import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Simple update - just change the status
    const { data, error } = await supabase
      .from('access_requests')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating access request:', error);
      return NextResponse.json({ error: "Failed to update access request" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data,
      message: `Access request ${status} successfully`
    });

  } catch (error) {
    console.error('Update access request API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
