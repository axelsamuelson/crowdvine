import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    // Check admin cookie
    const adminAuth = request.cookies.get("admin-auth")?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to get all users with profiles
    const adminSupabase = getSupabaseAdmin();

    // Get all users from auth.users
    const { data: authUsers, error: listUsersError } =
      await adminSupabase.auth.admin.listUsers();

    if (listUsersError) {
      console.error("Error fetching auth users:", listUsersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      );
    }

    // Get all profiles with membership data
    const { data: profiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .select("id, email, role, created_at, full_name");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 },
      );
    }

    // Get all memberships
    const { data: memberships, error: membershipsError } = await adminSupabase
      .from("user_memberships")
      .select(
        "user_id, level, impact_points, invite_quota_monthly, invites_used_this_month, created_at",
      );

    if (membershipsError) {
      console.error("Error fetching memberships:", membershipsError);
      return NextResponse.json(
        { error: "Failed to fetch memberships" },
        { status: 500 },
      );
    }

    // Combine auth users with profiles and membership data
    const usersWithData = (authUsers.users || [])
      .filter((authUser) =>
        profiles?.some((profile) => profile.id === authUser.id),
      )
      .map((authUser) => {
        const profile = profiles?.find((p) => p.id === authUser.id);
        const membership = memberships?.find((m) => m.user_id === authUser.id);

        return {
          id: authUser.id,
          email: authUser.email,
          full_name: profile?.full_name,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          email_confirmed_at: authUser.email_confirmed_at,
          role: profile?.role || "user",
          // Membership data
          membership_level: membership?.level || "requester",
          impact_points: membership?.impact_points || 0,
          invite_quota: membership?.invite_quota_monthly || 0,
          invites_used: membership?.invites_used_this_month || 0,
          membership_created_at: membership?.created_at,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime(),
      );

    return NextResponse.json(usersWithData);
  } catch (error) {
    console.error("Users API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check admin cookie
    const adminAuth = request.cookies.get("admin-auth")?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const adminSupabase = getSupabaseAdmin();

    // First, check if user exists in auth.users
    const { data: authUser, error: getUserError } =
      await adminSupabase.auth.admin.getUserById(userId);

    if (getUserError) {
      console.error("Error getting user:", getUserError);
      return NextResponse.json(
        { error: `User not found: ${getUserError.message}` },
        { status: 404 },
      );
    }

    if (!authUser.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete related data first (in case there are foreign key constraints)
    // Order matters: delete child records before parent records
    const relatedTables = [
      // Reservation items (references reservations)
      {
        table: "order_reservation_items",
        via: "reservation_id",
        parentTable: "order_reservations",
      },

      // Reservations (references user_id)
      { table: "order_reservations", direct: "user_id" },

      // Bookings (references user_id)
      { table: "bookings", direct: "user_id" },

      // Cart items (references carts)
      { table: "cart_items", via: "cart_id", parentTable: "carts" },

      // Carts (references user_id)
      { table: "carts", direct: "user_id" },

      // User addresses (references user_id)
      { table: "user_addresses", direct: "user_id" },

      // User payment methods (references user_id)
      { table: "user_payment_methods", direct: "user_id" },

      // Access requests (references reviewed_by)
      { table: "access_requests", direct: "reviewed_by" },

      // Invitation codes - handle created_by and used_by separately
      // For created_by: update to null instead of deleting
      // For used_by: update to null instead of deleting

      // User access (references user_id and granted_by)
      { table: "user_access", direct: "user_id" },
      { table: "user_access", direct: "granted_by" },
    ];

    console.log(`Starting deletion of related data for user: ${userId}`);
    console.log(`Will check ${relatedTables.length} tables for related data`);

    const deletedCounts = {};

    for (const tableInfo of relatedTables) {
      try {
        if (tableInfo.direct) {
          // Direct reference to user_id
          const { error, count } = await adminSupabase
            .from(tableInfo.table)
            .delete()
            .eq(tableInfo.direct, userId)
            .select("*", { count: "exact", head: true });

          if (error) {
            console.warn(
              `Warning: Could not delete from ${tableInfo.table}:`,
              error.message,
            );
            deletedCounts[tableInfo.table] = { error: error.message };
          } else {
            console.log(
              `Deleted ${count || 0} records from ${tableInfo.table}`,
            );
            deletedCounts[tableInfo.table] = { count: count || 0 };
          }
        } else if (tableInfo.via && tableInfo.parentTable) {
          // Indirect reference via parent table
          // First get all parent IDs that belong to this user
          const { data: parentRecords } = await adminSupabase
            .from(tableInfo.parentTable)
            .select("id")
            .eq("user_id", userId);

          if (parentRecords && parentRecords.length > 0) {
            const parentIds = parentRecords.map((r) => r.id);

            const { error, count } = await adminSupabase
              .from(tableInfo.table)
              .delete()
              .in(tableInfo.via, parentIds)
              .select("*", { count: "exact", head: true });

            if (error) {
              console.warn(
                `Warning: Could not delete from ${tableInfo.table}:`,
                error.message,
              );
              deletedCounts[tableInfo.table] = { error: error.message };
            } else {
              console.log(
                `Deleted ${count || 0} records from ${tableInfo.table}`,
              );
              deletedCounts[tableInfo.table] = { count: count || 0 };
            }
          }
        }
      } catch (relatedDataError) {
        console.warn(
          `Warning: Could not delete from ${tableInfo.table}:`,
          relatedDataError,
        );
        // Continue with other tables even if one fails
      }
    }

    // Handle invitation codes separately - update references to null instead of deleting
    console.log("Handling invitation codes references...");
    try {
      // Update created_by references to null
      const { error: createdByError } = await adminSupabase
        .from("invitation_codes")
        .update({ created_by: null })
        .eq("created_by", userId);

      if (createdByError) {
        console.warn(
          "Warning: Could not update invitation_codes.created_by:",
          createdByError.message,
        );
      } else {
        console.log("Updated invitation_codes.created_by references to null");
      }

      // Update used_by references to null
      const { error: usedByError } = await adminSupabase
        .from("invitation_codes")
        .update({ used_by: null })
        .eq("used_by", userId);

      if (usedByError) {
        console.warn(
          "Warning: Could not update invitation_codes.used_by:",
          usedByError.message,
        );
      } else {
        console.log("Updated invitation_codes.used_by references to null");
      }
    } catch (invitationError) {
      console.warn(
        "Warning: Could not handle invitation codes:",
        invitationError,
      );
    }

    // Handle discount codes separately - update earned_by_user_id to null
    console.log("Handling discount codes references...");
    try {
      const { error: discountError } = await adminSupabase
        .from("discount_codes")
        .update({ earned_by_user_id: null })
        .eq("earned_by_user_id", userId);

      if (discountError) {
        console.warn(
          "Warning: Could not update discount_codes.earned_by_user_id:",
          discountError.message,
        );
      } else {
        console.log(
          "Updated discount_codes.earned_by_user_id references to null",
        );
      }
    } catch (discountError) {
      console.warn("Warning: Could not handle discount codes:", discountError);
    }

    // Delete from profiles table
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
      return NextResponse.json(
        { error: `Failed to delete user profile: ${profileError.message}` },
        { status: 500 },
      );
    }

    // Try to delete from auth.users
    const { error: authError } =
      await adminSupabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("Error deleting auth user:", authError);

      // If auth deletion fails, try to disable the user instead
      const { error: disableError } =
        await adminSupabase.auth.admin.updateUserById(userId, {
          email_confirm: false,
          user_metadata: {
            ...authUser.user.user_metadata,
            disabled: true,
            deleted_at: new Date().toISOString(),
          },
        });

      if (disableError) {
        console.error("Error disabling auth user:", disableError);
        return NextResponse.json(
          {
            error: `Failed to delete user from auth: ${authError.message}. Also failed to disable user: ${disableError.message}`,
            details: { authError, disableError },
          },
          { status: 500 },
        );
      }

      // Mark profile as deleted instead
      const { error: softDeleteError } = await adminSupabase
        .from("profiles")
        .update({
          email: `deleted_${Date.now()}_${authUser.user.email}`,
          deleted_at: new Date().toISOString(),
          access_granted_at: null,
        })
        .eq("id", userId);

      if (softDeleteError) {
        console.error("Error soft deleting profile:", softDeleteError);
        return NextResponse.json(
          {
            error: `Failed to delete user from auth: ${authError.message}. Profile could not be soft deleted either.`,
            details: { authError, softDeleteError },
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        message: "User disabled and marked as deleted (auth deletion failed)",
        warning:
          "User was disabled instead of deleted due to auth system constraints",
      });
    }

    // Log successful deletion
    console.log(
      `Successfully deleted user: ${authUser.user.email} (${userId})`,
    );

    return NextResponse.json({
      message: "User and all related data deleted successfully",
      deletedUser: {
        id: userId,
        email: authUser.user.email,
      },
      deletedData: deletedCounts,
    });
  } catch (error) {
    console.error("Delete user API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check admin cookie
    const adminAuth = request.cookies.get("admin-auth")?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, updates } = await request.json();

    if (!userId || !updates) {
      return NextResponse.json(
        { error: "User ID and updates are required" },
        { status: 400 },
      );
    }

    const adminSupabase = getSupabaseAdmin();

    // Update profile role if provided
    if (updates.role) {
      const { error: profileError } = await adminSupabase
        .from("profiles")
        .update({
          role: updates.role,
        })
        .eq("id", userId);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        return NextResponse.json(
          { error: "Failed to update user role" },
          { status: 500 },
        );
      }
    }

    // Update membership level if provided
    if (updates.membership_level) {
      const { error: membershipError } = await adminSupabase
        .from("user_memberships")
        .update({
          level: updates.membership_level,
        })
        .eq("user_id", userId);

      if (membershipError) {
        console.error("Error updating membership:", membershipError);
        return NextResponse.json(
          { error: "Failed to update membership level" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Update user API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
