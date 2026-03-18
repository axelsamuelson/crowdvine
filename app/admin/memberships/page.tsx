import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  LEVEL_THRESHOLDS,
  INVITE_QUOTAS,
} from "@/lib/membership/points-engine";
import { MembershipsClient } from "./memberships-client";
import { ProgressionRewardsConfig } from "@/components/admin/progression-rewards-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function MembershipsPage() {
  const sb = getSupabaseAdmin();

  // Fetch perks for all levels
  const { data: perks } = await sb
    .from("membership_perks")
    .select("*")
    .eq("is_active", true)
    .order("level")
    .order("sort_order");

  // Group perks by level
  const perksByLevel = {
    basic: perks?.filter((p) => p.level === "basic") || [],
    brons: perks?.filter((p) => p.level === "brons") || [],
    silver: perks?.filter((p) => p.level === "silver") || [],
    guld: perks?.filter((p) => p.level === "guld") || [],
    privilege: perks?.filter((p) => p.level === "privilege") || [],
    admin: perks?.filter((p) => p.level === "admin") || [],
  };

  // Fetch progression rewards (v2)
  const { data: progressionRewards } = await sb
    .from("progression_rewards")
    .select("*")
    .order("level_segment")
    .order("ip_threshold");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Membership Management
        </h1>
        <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
          Configure levels, perks, benefits, and progression rewards
        </p>
      </div>

      <Tabs defaultValue="levels" className="w-full">
        <TabsList className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-1">
          <TabsTrigger
            value="levels"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            Membership Levels
          </TabsTrigger>
          <TabsTrigger
            value="progression"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            Progression Rewards
          </TabsTrigger>
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
