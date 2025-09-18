import { NextResponse } from "next/server";
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

    // Check if user is admin - try user_access table first, then profiles
    const { data: userAccess } = await supabase
      .from('user_access')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userAccess?.role === 'admin' || profile?.role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Use admin client to get all users with profiles
    const adminSupabase = getSupabaseAdmin();
    
    // Get all users from auth.users
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Get profiles with access_granted_at
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id, email, access_granted_at, role')
      .not('access_granted_at', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
    }

    // Combine auth users with profiles data
    const usersWithAccess = (authUsers.users || [])
      .filter(authUser => 
        profiles?.some(profile => profile.id === authUser.id)
      )
      .map(authUser => {
        const profile = profiles?.find(p => p.id === authUser.id);
        return {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          email_confirmed_at: authUser.email_confirmed_at,
          access_granted_at: profile?.access_granted_at,
          role: profile?.role || 'user'
        };
      })
      .sort((a, b) => new Date(b.access_granted_at || '').getTime() - new Date(a.access_granted_at || '').getTime());

    return NextResponse.json(usersWithAccess);

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}