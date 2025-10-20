"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  buff_percentage: "bg-amber-100 text-amber-700",
  badge: "bg-blue-100 text-blue-700",
  early_access_token: "bg-purple-100 text-purple-700",
  fee_waiver: "bg-green-100 text-green-700",
  celebration: "bg-rose-100 text-rose-700",
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
          <h2 className="text-2xl font-bold text-gray-900">
            Progression Rewards
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure temporary buffs and rewards earned during level
            progression
          </p>
        </div>
      </div>

      <Tabs defaultValue="basic-bronze" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic-bronze">Basic → Bronze</TabsTrigger>
          <TabsTrigger value="bronze-silver">Bronze → Silver</TabsTrigger>
          <TabsTrigger value="silver-gold">Silver → Gold</TabsTrigger>
        </TabsList>

        {Object.entries(rewardsBySegment).map(([segment, segmentRewards]) => (
          <TabsContent key={segment} value={segment} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {segmentNames[segment]}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Rewards awarded at specific IP thresholds in this segment
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {segmentRewards.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
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
                          "bg-gray-100 text-gray-700";

                        return (
                          <div
                            key={reward.id}
                            className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            {/* Icon */}
                            <div className={`p-2 rounded-lg ${colorClass}`}>
                              <Icon className="w-5 h-5" />
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  At {reward.ip_threshold} IP
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {reward.reward_type.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700">
                                {reward.reward_description}
                              </p>
                              {reward.reward_value && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Value: {reward.reward_value}
                                  {reward.reward_type === "buff_percentage" &&
                                    "%"}
                                </p>
                              )}
                            </div>

                            {/* Status */}
                            <Badge
                              variant={
                                reward.is_active ? "default" : "secondary"
                              }
                            >
                              {reward.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {segmentRewards.filter((r) => r.is_active).length}
                    </p>
                    <p className="text-xs text-gray-600">Active Rewards</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">
                      {
                        segmentRewards.filter(
                          (r) => r.reward_type === "buff_percentage",
                        ).length
                      }
                    </p>
                    <p className="text-xs text-gray-600">Buff Rewards</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {
                        segmentRewards.filter((r) => r.reward_type === "badge")
                          .length
                      }
                    </p>
                    <p className="text-xs text-gray-600">Badge Rewards</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {
                        segmentRewards.filter(
                          (r) =>
                            r.reward_type === "fee_waiver" ||
                            r.reward_type === "early_access_token",
                        ).length
                      }
                    </p>
                    <p className="text-xs text-gray-600">Special Rewards</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">
                How Progression Rewards Work
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • <strong>Buff Percentage:</strong> Temporary discount applied
                  to next order, then expires
                </li>
                <li>
                  • <strong>Badge:</strong> Unlockable achievement shown in user
                  profile
                </li>
                <li>
                  • <strong>Early Access Token:</strong> One-time early access
                  to a wine drop
                </li>
                <li>
                  • <strong>Fee Waiver:</strong> One-time service fee waived on
                  next order
                </li>
                <li>
                  • <strong>Celebration:</strong> Special UI celebration (e.g.,
                  confetti for Gold unlock)
                </li>
              </ul>
              <p className="text-xs text-blue-700 mt-3">
                All buffs are cleared when user reaches next level. This
                encourages consistent engagement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
