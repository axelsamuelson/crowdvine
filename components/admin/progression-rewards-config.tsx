"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Gift, Award, TrendingUp } from "lucide-react";

interface ProgressionReward {
  id: string;
  level_segment: string;
  ip_threshold: number;
  reward_type: string;
  reward_value: string;
  reward_description: string;
  is_active: boolean;
  sort_order: number;
}

interface ProgressionRewardsConfigProps {
  rewards: ProgressionReward[];
}

const segmentNames: Record<string, string> = {
  "basic-bronze": "Basic → Bronze (0-4 IP)",
  "bronze-silver": "Bronze → Silver (5-14 IP)",
  "silver-gold": "Silver → Gold (15-34 IP)",
};

const rewardTypeIcons: Record<string, any> = {
  buff_percentage: Sparkles,
  badge: Award,
  early_access_token: TrendingUp,
  fee_waiver: Gift,
  celebration: Gift,
};

const rewardTypeColors: Record<string, string> = {
  buff_percentage:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  early_access_token:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  fee_waiver:
    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  celebration:
    "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
};

export function ProgressionRewardsConfig({
  rewards,
}: ProgressionRewardsConfigProps) {
  const [rewardsList, setRewardsList] = useState(rewards);

  const rewardsBySegment = {
    "basic-bronze": rewardsList.filter(
      (r) => r.level_segment === "basic-bronze",
    ),
    "bronze-silver": rewardsList.filter(
      (r) => r.level_segment === "bronze-silver",
    ),
    "silver-gold": rewardsList.filter((r) => r.level_segment === "silver-gold"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Progression Rewards
          </h2>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
            Configure temporary buffs and rewards earned during level progression
          </p>
        </div>
      </div>

      <Tabs defaultValue="basic-bronze" className="w-full">
        <TabsList className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-1 grid w-full grid-cols-3">
          <TabsTrigger
            value="basic-bronze"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            Basic → Bronze
          </TabsTrigger>
          <TabsTrigger
            value="bronze-silver"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            Bronze → Silver
          </TabsTrigger>
          <TabsTrigger
            value="silver-gold"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            Silver → Gold
          </TabsTrigger>
        </TabsList>

        {Object.entries(rewardsBySegment).map(([segment, segmentRewards]) => (
          <TabsContent key={segment} value={segment} className="space-y-4 mt-6">
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">
                {segmentNames[segment]}
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
                Rewards awarded at specific IP thresholds in this segment
              </p>
              {segmentRewards.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-zinc-400 text-center py-8">
                  No progression rewards configured for this segment
                </p>
              ) : (
                <div className="space-y-3">
                  {segmentRewards
                    .sort(
                      (a, b) =>
                        a.ip_threshold - b.ip_threshold ||
                        a.sort_order - b.sort_order,
                    )
                    .map((reward) => {
                      const Icon =
                        rewardTypeIcons[reward.reward_type] || Sparkles;
                      const colorClass =
                        rewardTypeColors[reward.reward_type] ||
                        "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-zinc-300";

                      return (
                        <div
                          key={reward.id}
                          className="flex items-start gap-4 p-4 border border-gray-100 dark:border-zinc-800 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                                At {reward.ip_threshold} IP
                              </span>
                              <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300">
                                {reward.reward_type.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-zinc-400">
                              {reward.reward_description}
                            </p>
                            {reward.reward_value && (
                              <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">
                                Value: {reward.reward_value}
                                {reward.reward_type === "buff_percentage" &&
                                  "%"}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${
                              reward.is_active
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-zinc-400"
                            }`}
                          >
                            {reward.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
                    {segmentRewards.filter((r) => r.is_active).length}
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-zinc-400">
                    Active Rewards
                  </p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">
                    {
                      segmentRewards.filter(
                        (r) => r.reward_type === "buff_percentage",
                      ).length
                    }
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-zinc-400">
                    Buff Rewards
                  </p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    {
                      segmentRewards.filter((r) => r.reward_type === "badge")
                        .length
                    }
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-zinc-400">
                    Badge Rewards
                  </p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    {
                      segmentRewards.filter(
                        (r) =>
                          r.reward_type === "fee_waiver" ||
                          r.reward_type === "early_access_token",
                      ).length
                    }
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-zinc-400">
                    Special Rewards
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Info Box */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] border-l-4 border-l-blue-500 dark:border-l-blue-400">
        <div className="flex gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              How Progression Rewards Work
            </h3>
            <ul className="text-xs text-gray-600 dark:text-zinc-400 space-y-1">
              <li>
                • <strong className="text-gray-900 dark:text-zinc-100">Buff Percentage:</strong> Temporary discount applied to next order, then expires
              </li>
              <li>
                • <strong className="text-gray-900 dark:text-zinc-100">Badge:</strong> Unlockable achievement shown in user profile
              </li>
              <li>
                • <strong className="text-gray-900 dark:text-zinc-100">Early Access Token:</strong> One-time early access to a wine drop
              </li>
              <li>
                • <strong className="text-gray-900 dark:text-zinc-100">Fee Waiver:</strong> One-time service fee waived on next order
              </li>
              <li>
                • <strong className="text-gray-900 dark:text-zinc-100">Celebration:</strong> Special UI celebration (e.g. confetti for Gold unlock)
              </li>
            </ul>
            <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-3">
              All buffs are cleared when user reaches next level. This encourages consistent engagement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
