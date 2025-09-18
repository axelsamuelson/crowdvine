import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    console.log('=== BULK DELETE ACCESS REQUESTS START ===');
    
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "IDs array is required" }, { status: 400 });
    }

    // Check admin cookie
    const adminAuth = request.cookies.get('admin-auth')?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    let totalDeleted = {
      accessRequests: 0,
      accessTokens: 0,
      invitationCodes: 0,
      authUsers: 0
    };

    // Process each access request
    for (const id of ids) {
      console.log(`Processing access request ID: ${id}`);
      
      // Get the access request
      const { data: accessRequest, error: fetchError } = await supabase
        .from('access_requests')
        .select('email')
        .eq('id', id)
        .single();

      if (fetchError || !accessRequest) {
        console.error(`Error fetching access request ${id}:`, fetchError);
        continue;
      }

      const email = accessRequest.email.toLowerCase().trim();
      console.log(`  Found email: ${email}`);

      // Delete access tokens
      const { data: deletedTokens } = await supabase
        .from('access_tokens')
        .delete()
        .eq('email', email)
        .select();

      if (deletedTokens) {
        totalDeleted.accessTokens += deletedTokens.length;
        console.log(`    Deleted ${deletedTokens.length} access tokens`);
      }

      // Delete invitation codes
      const { data: deletedInvitations } = await supabase
        .from('invitation_codes')
        .delete()
        .eq('email', email)
        .select();

      if (deletedInvitations) {
        totalDeleted.invitationCodes += deletedInvitations.length;
        console.log(`    Deleted ${deletedInvitations.length} invitation codes`);
      }

      // Check for orphaned auth user
      const { data: authUser } = await supabase.auth.admin.getUserByEmail(email);
      
      if (authUser?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authUser.user.id)
          .single();

        if (!profile) {
          const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authUser.user.id);
          
          if (!deleteUserError) {
            totalDeleted.authUsers++;
            console.log(`    Deleted orphaned auth user`);
          }
        }
      }

      // Delete the access request
      const { error: deleteError } = await supabase
        .from('access_requests')
        .delete()
        .eq('id', id);

      if (!deleteError) {
        totalDeleted.accessRequests++;
        console.log(`    Deleted access request`);
      }
    }

    console.log('=== BULK DELETE COMPLETE ===');
    console.log('Total deleted:', totalDeleted);

    return NextResponse.json({ 
      success: true,
      message: `Bulk delete completed successfully`,
      deleted: totalDeleted
    });

  } catch (error) {
    console.error('Bulk delete access requests API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
