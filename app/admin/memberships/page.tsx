import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { LEVEL_THRESHOLDS, INVITE_QUOTAS } from "@/lib/membership/points-engine";
import { MembershipsClient } from "./memberships-client";
import { ProgressionRewardsConfig } from "@/components/admin/progression-rewards-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  
  // Fetch progression rewards (v2)
  const { data: progressionRewards } = await sb
    .from('progression_rewards')
    .select('*')
    .order('level_segment')
    .order('ip_threshold');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Membership Management</h1>
        <p className="text-gray-600 mt-2">
          Configure levels, perks, benefits, and progression rewards
        </p>
      </div>

      <Tabs defaultValue="levels" className="w-full">
        <TabsList>
          <TabsTrigger value="levels">Membership Levels</TabsTrigger>
          <TabsTrigger value="progression">Progression Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="mt-6">
          <MembershipsClient 
            perksByLevel={perksByLevel}
            levelThresholds={LEVEL_THRESHOLDS}
            inviteQuotas={INVITE_QUOTAS}
          />
        </TabsContent>

        <TabsContent value="progression" className="mt-6">
          <ProgressionRewardsConfig rewards={progressionRewards || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

