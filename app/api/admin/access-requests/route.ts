import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: NextRequest) {
  try {
    console.log('=== DEBUG: Starting PATCH request ===');
    
    const { id, status, notes } = await request.json();
    console.log('DEBUG: Request data:', { id, status, notes });

    // Check admin cookie
    const adminAuth = request.cookies.get('admin-auth')?.value;
    if (!adminAuth) {
      console.log('DEBUG: No admin auth cookie');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log('DEBUG: Admin auth cookie found');

    // Get the access request to find the email
    const supabase = getSupabaseAdmin();
    console.log('DEBUG: Fetching access request with ID:', id);
    
    const { data: accessRequest, error: fetchError } = await supabase
      .from('access_requests')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError || !accessRequest) {
      console.error('DEBUG: Error fetching access request:', fetchError);
      return NextResponse.json({ error: "Access request not found" }, { status: 404 });
    }
    console.log('DEBUG: Access request found:', accessRequest);

    // Update access request - simplified version
    console.log('DEBUG: Updating access request...');
    const { data, error } = await supabase
      .from('access_requests')
      .update({
        status,
        notes: notes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('DEBUG: Error updating access request:', error);
      console.error('DEBUG: Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: "Failed to update access request" }, { status: 500 });
    }
    console.log('DEBUG: Access request updated successfully:', data);

    // For now, skip the complex approval logic and just return success
    console.log('DEBUG: Returning success response');
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('DEBUG: Unexpected error in PATCH:', error);
    console.error('DEBUG: Error stack:', error.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}