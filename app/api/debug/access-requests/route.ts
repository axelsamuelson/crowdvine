import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    console.log('=== DIAGNOSTIC ACCESS REQUESTS ===');
    
    const adminSupabase = getSupabaseAdmin();
    
    // 1. Check if table exists
    console.log('1. Checking if access_requests table exists...');
    const { data: tableCheck, error: tableError } = await adminSupabase
      .from('access_requests')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.error('Table check error:', tableError);
      return NextResponse.json({ 
        error: "Table does not exist or RLS issue",
        details: tableError.message,
        code: tableError.code,
        hint: tableError.hint
      }, { status: 500 });
    }
    
    // 2. Try to fetch all requests (bypassing RLS with admin client)
    console.log('2. Fetching all access requests...');
    const { data: allRequests, error: fetchError } = await adminSupabase
      .from('access_requests')
      .select('*')
      .order('requested_at', { ascending: false });
    
    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ 
        error: "Failed to fetch access requests",
        details: fetchError.message,
        code: fetchError.code
      }, { status: 500 });
    }
    
    console.log('3. Found requests:', allRequests?.length || 0);
    
    // 3. Check profiles table
    console.log('4. Checking profiles table...');
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('email, access_granted_at')
      .not('access_granted_at', 'is', null);
    
    if (profilesError) {
      console.error('Profiles error:', profilesError);
    }
    
    // 4. Apply the same filtering logic as the admin API
    const emailsWithAccess = new Set(profiles?.map(p => p.email) || []);
    const filteredRequests = allRequests?.filter(request => 
      !emailsWithAccess.has(request.email)
    ) || [];
    
    console.log('5. After filtering:', filteredRequests.length);
    console.log('=== DIAGNOSTIC COMPLETE ===');
    
    return NextResponse.json({
      success: true,
      totalRequests: allRequests?.length || 0,
      filteredRequests: filteredRequests.length,
      requests: filteredRequests,
      emailsWithAccess: Array.from(emailsWithAccess),
      debug: {
        allRequests: allRequests,
        profiles: profiles
      }
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}