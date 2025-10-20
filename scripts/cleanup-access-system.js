#!/usr/bin/env node

/**
 * Cleanup script för att fixa befintliga problem med access requests och users
 * Kör detta script för att rensa upp duplicerade data och fixa inkonsistenser
 */

import { getSupabaseAdmin } from "../lib/supabase-admin.js";

async function cleanupAccessSystem() {
  console.log("🧹 Starting cleanup of access system...");

  try {
    const supabase = getSupabaseAdmin();

    // 1. Hitta användare som finns i auth.users men inte i profiles
    console.log("1. Checking for orphaned auth users...");
    const { data: authUsers } = await supabase.auth.admin.listUsers();

    if (authUsers?.users) {
      for (const user of authUsers.users) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!profile) {
          console.log(`   Found orphaned user: ${user.email} (${user.id})`);

          // Skapa profil för orphaned user
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              email: user.email?.toLowerCase().trim(),
              role: "user",
              access_granted_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (profileError) {
            console.error(
              `   Error creating profile for ${user.email}:`,
              profileError,
            );
          } else {
            console.log(`   ✅ Created profile for ${user.email}`);
          }
        }
      }
    }

    // 2. Rensa gamla access requests för användare som redan har access
    console.log("2. Cleaning up old access requests...");
    const { data: profilesWithAccess } = await supabase
      .from("profiles")
      .select("email")
      .not("access_granted_at", "is", null);

    if (profilesWithAccess) {
      const emailsWithAccess = profilesWithAccess.map((p) => p.email);

      // Delete access requests
      const { error: deleteError } = await supabase
        .from("access_requests")
        .delete()
        .in("email", emailsWithAccess);

      if (deleteError) {
        console.error("   Error deleting old access requests:", deleteError);
      } else {
        console.log(
          `   ✅ Cleaned up access requests for ${emailsWithAccess.length} users with access`,
        );
      }
    }

    // 2b. Rensa access requests som är äldre än 30 dagar och inte har blivit godkända
    console.log("2b. Cleaning up old pending access requests...");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: oldRequests } = await supabase
      .from("access_requests")
      .delete()
      .lt("requested_at", thirtyDaysAgo.toISOString())
      .eq("status", "pending")
      .select();

    console.log(
      `   ✅ Cleaned up ${oldRequests?.length || 0} old pending access requests`,
    );

    // 3. Rensa gamla access tokens för användare som redan har access
    console.log("3. Cleaning up old access tokens...");
    if (profilesWithAccess) {
      const emailsWithAccess = profilesWithAccess.map((p) => p.email);

      const { error: tokenDeleteError } = await supabase
        .from("access_tokens")
        .delete()
        .in("email", emailsWithAccess);

      if (tokenDeleteError) {
        console.error("   Error deleting old access tokens:", tokenDeleteError);
      } else {
        console.log(
          `   ✅ Cleaned up access tokens for ${emailsWithAccess.length} users with access`,
        );
      }
    }

    // 4. Rensa expired tokens
    console.log("4. Cleaning up expired tokens...");
    const { data: expiredTokens } = await supabase
      .from("access_tokens")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .eq("used", false)
      .select();

    console.log(
      `   ✅ Cleaned up ${expiredTokens?.length || 0} expired tokens`,
    );

    // 5. Rensa expired invitation codes
    console.log("5. Cleaning up expired invitation codes...");
    const { data: expiredInvitations } = await supabase
      .from("invitation_codes")
      .update({ is_active: false })
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true)
      .select();

    console.log(
      `   ✅ Cleaned up ${expiredInvitations?.length || 0} expired invitation codes`,
    );

    console.log("🎉 Cleanup completed successfully!");

    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("💥 Cleanup failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

// Run cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupAccessSystem()
    .then((result) => {
      if (result.success) {
        console.log("Cleanup completed:", result);
        process.exit(0);
      } else {
        console.error("Cleanup failed:", result);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Unexpected error:", error);
      process.exit(1);
    });
}

export { cleanupAccessSystem };
