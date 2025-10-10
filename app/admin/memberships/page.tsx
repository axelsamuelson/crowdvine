import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { LEVEL_THRESHOLDS, INVITE_QUOTAS } from "@/lib/membership/points-engine";
import { MembershipsClient } from "./memberships-client";

export default async function MembershipsPage() {
  const sb = getSupabaseAdmin();

  // Fetch perks for all levels
  const { data: perks } = await sb
    .from('membership_perks')
    .select('*')
    .eq('is_active', true)
    .order('level')
    .order('sort_order');

  // Group perks by level
  const perksByLevel = {
    basic: perks?.filter(p => p.level === 'basic') || [],
    brons: perks?.filter(p => p.level === 'brons') || [],
    silver: perks?.filter(p => p.level === 'silver') || [],
    guld: perks?.filter(p => p.level === 'guld') || [],
    admin: perks?.filter(p => p.level === 'admin') || [],
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Membership Management</h1>
        <p className="text-gray-600 mt-2">
          Configure levels, perks, and benefits for each membership tier
        </p>
      </div>

      <MembershipsClient 
        perksByLevel={perksByLevel}
        levelThresholds={LEVEL_THRESHOLDS}
        inviteQuotas={INVITE_QUOTAS}
      />
    </div>
  );
}

