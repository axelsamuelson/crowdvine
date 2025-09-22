import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    // Check admin cookie
    const adminAuth = request.cookies.get('admin-auth')?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to get all users with profiles
    const adminSupabase = getSupabaseAdmin();
    
    // Get all users from auth.users
    const { data: authUsers, error: listUsersError } = await adminSupabase.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error('Error fetching auth users:', listUsersError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Get all profiles (both with and without access)
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id, email, access_granted_at, role, created_at, updated_at, invite_code_used');

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
          role: profile?.role || 'user',
          invite_code_used: profile?.invite_code_used,
          updated_at: profile?.updated_at
        };
      })
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

    return NextResponse.json(usersWithAccess);

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check admin cookie
    const adminAuth = request.cookies.get('admin-auth')?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();

    // First, check if user exists in auth.users
    const { data: authUser, error: getUserError } = await adminSupabase.auth.admin.getUserById(userId);
    
    if (getUserError) {
      console.error('Error getting user:', getUserError);
      return NextResponse.json({ error: `User not found: ${getUserError.message}` }, { status: 404 });
    }

    if (!authUser.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete related data first (in case there are foreign key constraints)
    // Order matters: delete child records before parent records
    const relatedTables = [
      // Reservation items (references reservations)
      { table: 'order_reservation_items', via: 'reservation_id', parentTable: 'order_reservations' },
      
      // Reservations (references user_id)
      { table: 'order_reservations', direct: 'user_id' },
      
      // Bookings (references user_id)
      { table: 'bookings', direct: 'user_id' },
      
      // Cart items (references carts)
      { table: 'cart_items', via: 'cart_id', parentTable: 'carts' },
      
      // Carts (references user_id)
      { table: 'carts', direct: 'user_id' },
      
      // User addresses (references user_id)
      { table: 'user_addresses', direct: 'user_id' },
      
      // User payment methods (references user_id)
      { table: 'user_payment_methods', direct: 'user_id' },
      
      // Access requests (references reviewed_by)
      { table: 'access_requests', direct: 'reviewed_by' },
      
      // Invitation codes (references created_by and used_by)
      { table: 'invitation_codes', direct: 'created_by' },
      { table: 'invitation_codes', direct: 'used_by' },
      
      // User access (references user_id and granted_by)
      { table: 'user_access', direct: 'user_id' },
      { table: 'user_access', direct: 'granted_by' }
    ];

    console.log(`Starting deletion of related data for user: ${userId}`);
    console.log(`Will check ${relatedTables.length} tables for related data`);
    
    let deletedCounts = {};
    
    for (const tableInfo of relatedTables) {
      try {
        if (tableInfo.direct) {
          // Direct reference to user_id
          const { error, count } = await adminSupabase
            .from(tableInfo.table)
            .delete()
            .eq(tableInfo.direct, userId)
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            console.warn(`Warning: Could not delete from ${tableInfo.table}:`, error.message);
            deletedCounts[tableInfo.table] = { error: error.message };
          } else {
            console.log(`Deleted ${count || 0} records from ${tableInfo.table}`);
            deletedCounts[tableInfo.table] = { count: count || 0 };
          }
        } else if (tableInfo.via && tableInfo.parentTable) {
          // Indirect reference via parent table
          // First get all parent IDs that belong to this user
          const { data: parentRecords } = await adminSupabase
            .from(tableInfo.parentTable)
            .select('id')
            .eq('user_id', userId);
          
          if (parentRecords && parentRecords.length > 0) {
            const parentIds = parentRecords.map(r => r.id);
            
            const { error, count } = await adminSupabase
              .from(tableInfo.table)
              .delete()
              .in(tableInfo.via, parentIds)
              .select('*', { count: 'exact', head: true });
            
            if (error) {
              console.warn(`Warning: Could not delete from ${tableInfo.table}:`, error.message);
              deletedCounts[tableInfo.table] = { error: error.message };
            } else {
              console.log(`Deleted ${count || 0} records from ${tableInfo.table}`);
              deletedCounts[tableInfo.table] = { count: count || 0 };
            }
          }
        }
      } catch (relatedDataError) {
        console.warn(`Warning: Could not delete from ${tableInfo.table}:`, relatedDataError);
        // Continue with other tables even if one fails
      }
    }

    // Delete from profiles table
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return NextResponse.json({ error: `Failed to delete user profile: ${profileError.message}` }, { status: 500 });
    }

    // Try to delete from auth.users
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      
      // If auth deletion fails, try to disable the user instead
      const { error: disableError } = await adminSupabase.auth.admin.updateUserById(userId, {
        email_confirm: false,
        user_metadata: {
          ...authUser.user.user_metadata,
          disabled: true,
          deleted_at: new Date().toISOString()
        }
      });

      if (disableError) {
        console.error('Error disabling auth user:', disableError);
        return NextResponse.json({ 
          error: `Failed to delete user from auth: ${authError.message}. Also failed to disable user: ${disableError.message}`,
          details: { authError, disableError }
        }, { status: 500 });
      }

      // Mark profile as deleted instead
      const { error: softDeleteError } = await adminSupabase
        .from('profiles')
        .update({
          email: `deleted_${Date.now()}_${authUser.user.email}`,
          deleted_at: new Date().toISOString(),
          access_granted_at: null
        })
        .eq('id', userId);

      if (softDeleteError) {
        console.error('Error soft deleting profile:', softDeleteError);
        return NextResponse.json({ 
          error: `Failed to delete user from auth: ${authError.message}. Profile could not be soft deleted either.`,
          details: { authError, softDeleteError }
        }, { status: 500 });
      }

      return NextResponse.json({ 
        message: "User disabled and marked as deleted (auth deletion failed)",
        warning: "User was disabled instead of deleted due to auth system constraints"
      });
    }

    // Log successful deletion
    console.log(`Successfully deleted user: ${authUser.user.email} (${userId})`);
    
    return NextResponse.json({ 
      message: "User and all related data deleted successfully",
      deletedUser: {
        id: userId,
        email: authUser.user.email
      },
      deletedData: deletedCounts
    });

  } catch (error) {
    console.error('Delete user API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check admin cookie
    const adminAuth = request.cookies.get('admin-auth')?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, updates } = await request.json();
    
    if (!userId || !updates) {
      return NextResponse.json({ error: "User ID and updates are required" }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();

    // Update profile
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        role: updates.role,
        access_granted_at: updates.access_granted_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
    }

    return NextResponse.json({ message: "User updated successfully" });

  } catch (error) {
    console.error('Update user API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}