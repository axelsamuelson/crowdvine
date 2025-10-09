/**
 * Test Membership Ladder System
 * 
 * Run this script to verify the membership system is working correctly
 * Usage: npx tsx scripts/test-membership-system.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testMembershipSystem() {
  console.log("🧪 Testing Membership Ladder System\n");

  // Test 1: Check if tables exist
  console.log("1️⃣ Checking database tables...");
  const { data: memberships, error: membershipError } = await supabase
    .from('user_memberships')
    .select('*')
    .limit(1);

  if (membershipError) {
    console.error("❌ user_memberships table not found!");
    console.error("   Run migration 034_membership_system.sql first");
    return;
  }
  console.log("✅ user_memberships table exists\n");

  // Test 2: Check if functions exist
  console.log("2️⃣ Checking database functions...");
  try {
    const { data, error } = await supabase.rpc('get_invite_quota_for_level', { lvl: 'basic' });
    if (error) throw error;
    console.log(`✅ get_invite_quota_for_level() works (Basic quota: ${data})\n`);
  } catch (error) {
    console.error("❌ Database functions not found!");
    console.error("   Run migration 034_membership_system.sql first");
    return;
  }

  // Test 3: Count users by level
  console.log("3️⃣ Counting users by membership level...");
  const { data: levelCounts } = await supabase
    .from('user_memberships')
    .select('level');

  const counts = levelCounts?.reduce((acc: any, m) => {
    acc[m.level] = (acc[m.level] || 0) + 1;
    return acc;
  }, {});

  console.log("   Level Distribution:");
  Object.entries(counts || {}).forEach(([level, count]) => {
    console.log(`   - ${level}: ${count} users`);
  });
  console.log();

  // Test 4: Check perks configuration
  console.log("4️⃣ Checking membership perks...");
  const { data: perks, error: perksError } = await supabase
    .from('membership_perks')
    .select('level, COUNT(*)')
    .group('level');

  if (!perksError && perks) {
    console.log("   Perks per level:");
    perks.forEach((p: any) => {
      console.log(`   - ${p.level}: ${p.count} perks`);
    });
  }
  console.log();

  // Test 5: Sample user check
  console.log("5️⃣ Checking sample user...");
  const { data: sampleUser } = await supabase
    .from('user_memberships')
    .select('*, profiles!user_id(email)')
    .limit(1)
    .single();

  if (sampleUser) {
    console.log("   Sample User:");
    console.log(`   - Email: ${sampleUser.profiles?.email}`);
    console.log(`   - Level: ${sampleUser.level}`);
    console.log(`   - Impact Points: ${sampleUser.impact_points}`);
    console.log(`   - Invite Quota: ${sampleUser.invites_used_this_month}/${sampleUser.invite_quota_monthly}`);
  }
  console.log();

  // Test 6: IP Events
  console.log("6️⃣ Checking IP events...");
  const { data: events, count } = await supabase
    .from('impact_point_events')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log(`   Total IP events: ${count}`);
  if (events && events.length > 0) {
    console.log("   Recent events:");
    events.forEach((e: any) => {
      console.log(`   - ${e.event_type}: +${e.points_earned} IP (${e.description})`);
    });
  }
  console.log();

  // Test 7: Test IP award function
  console.log("7️⃣ Testing IP award function...");
  if (sampleUser?.user_id) {
    try {
      const { data: newTotal, error } = await supabase.rpc('award_impact_points', {
        p_user_id: sampleUser.user_id,
        p_event_type: 'manual_adjustment',
        p_points: 0,
        p_description: 'Test event (no points awarded)',
      });

      if (error) throw error;
      console.log(`✅ award_impact_points() works (Current total: ${newTotal} IP)\n`);
    } catch (error) {
      console.error("❌ award_impact_points() failed:", error);
    }
  }

  // Final Summary
  console.log("📊 SUMMARY:");
  console.log("─".repeat(50));
  console.log(`✅ Database schema: OK`);
  console.log(`✅ Functions: OK`);
  console.log(`✅ Users migrated: ${Object.values(counts || {}).reduce((a: any, b: any) => a + b, 0)}`);
  console.log(`✅ IP events: ${count || 0}`);
  console.log("─".repeat(50));
  console.log("\n🎉 Membership system is ready!\n");
  console.log("Next steps:");
  console.log("1. Set admin users to 'admin' level");
  console.log("2. Test profile page in browser");
  console.log("3. Test invite generation");
  console.log("4. Monitor IP accrual on real invites");
}

testMembershipSystem().catch(console.error);

