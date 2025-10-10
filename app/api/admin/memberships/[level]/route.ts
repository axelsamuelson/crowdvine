import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * PATCH /api/admin/memberships/[level]
 * 
 * Update membership level configuration (discount, quota, etc.)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { level: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { level } = await params;
    const body = await request.json();
    const { discount, inviteQuota } = body;

    console.log("💼 Updating membership config:", { level, discount, inviteQuota });

    const sb = getSupabaseAdmin();

    // Check if user is admin
    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Update or insert discount perk
    if (discount !== undefined) {
      // Check if discount perk exists
      const { data: existingPerk } = await sb
        .from('membership_perks')
        .select('id')
        .eq('level', level)
        .eq('perk_type', 'discount')
        .single();

      if (existingPerk) {
        // Update existing discount perk
        const { error: updateError } = await sb
          .from('membership_perks')
          .update({
            perk_value: `${discount}%`,
            description: discount > 0 
              ? `${discount}% discount on all wine purchases`
              : 'No discount',
          })
          .eq('id', existingPerk.id);

        if (updateError) {
          console.error("Error updating discount perk:", updateError);
          throw updateError;
        }
        
        console.log("✅ Updated discount perk for", level, "to", discount, "%");
      } else {
        // Insert new discount perk
        const { error: insertError } = await sb
          .from('membership_perks')
          .insert({
            level,
            perk_type: 'discount',
            perk_value: `${discount}%`,
            description: discount > 0 
              ? `${discount}% discount on all wine purchases`
              : 'No discount',
            sort_order: 10,
            is_active: true,
          });

        if (insertError) {
          console.error("Error inserting discount perk:", insertError);
          throw insertError;
        }
        
        console.log("✅ Created discount perk for", level, "at", discount, "%");
      }
    }

    // Update invite quota (stored in perks table for now)
    if (inviteQuota !== undefined) {
      const { data: quotaPerk } = await sb
        .from('membership_perks')
        .select('id')
        .eq('level', level)
        .eq('perk_type', 'invite_quota')
        .single();

      if (quotaPerk) {
        const { error: updateError } = await sb
          .from('membership_perks')
          .update({
            perk_value: inviteQuota === 999999 ? 'unlimited' : `${inviteQuota}`,
            description: inviteQuota === 999999 
              ? 'Unlimited invites'
              : `Invite ${inviteQuota} friends per month`,
          })
          .eq('id', quotaPerk.id);

        if (updateError) {
          console.error("Error updating invite quota:", updateError);
          throw updateError;
        }
        
        console.log("✅ Updated invite quota for", level, "to", inviteQuota);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Configuration updated successfully" 
    });
  } catch (error: any) {
    console.error("❌ Error updating membership config:", error);
    return NextResponse.json(
      { error: "Failed to update configuration", details: error.message },
      { status: 500 }
    );
  }
}

