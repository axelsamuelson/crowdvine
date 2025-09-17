import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = await supabaseServer();

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Fetch access requests
    const { data: accessRequests, error } = await supabase
      .from('access_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching access requests:', error);
      return NextResponse.json({ error: "Failed to fetch access requests" }, { status: 500 });
    }

    return NextResponse.json(accessRequests || []);

  } catch (error) {
    console.error('Access requests API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status, notes } = await request.json();

    const supabase = await supabaseServer();

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get the access request to find the email
    const { data: accessRequest, error: fetchError } = await supabase
      .from('access_requests')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError || !accessRequest) {
      console.error('Error fetching access request:', fetchError);
      return NextResponse.json({ error: "Access request not found" }, { status: 404 });
    }

    // Update access request
    const { data, error } = await supabase
      .from('access_requests')
      .update({
        status,
        notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating access request:', error);
      return NextResponse.json({ error: "Failed to update access request" }, { status: 500 });
    }

    // If approved, grant access to the user
    if (status === 'approved') {
      // Use admin client to find user by email
      const adminSupabase = getSupabaseAdmin();
      const { data: authUser, error: userError } = await adminSupabase.auth.admin.getUserByEmail(accessRequest.email);
      
      if (userError || !authUser.user) {
        console.log('User not found in auth, will grant access when they sign up:', accessRequest.email);
      } else {
        // User exists, grant access immediately
        const { error: profileError } = await adminSupabase
          .from('profiles')
          .upsert({
            id: authUser.user.id,
            email: accessRequest.email,
            access_granted_at: new Date().toISOString(),
            role: 'user'
          });

        if (profileError) {
          console.error('Error granting access to user:', profileError);
          // Don't fail the request, just log the error
        } else {
          console.log('Access granted to user:', accessRequest.email);
        }
      }
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Update access request API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
