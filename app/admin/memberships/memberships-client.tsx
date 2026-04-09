"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, Save, Loader2, Award } from "lucide-react";
import { toast } from "sonner";

interface Perk {
  id: string;
  level: string;
  perk_type: string;
  perk_value: string | null;
  description: string;
  sort_order: number;
}

interface MembershipsClientProps {
  perksByLevel: {
    basic: Perk[];
    brons: Perk[];
    silver: Perk[];
    guld: Perk[];
    privilege: Perk[];
  };
  levelThresholds: any;
  inviteQuotas: any;
}

// Helper functions matching invitation page
const getLevelName = (level: string) => {
  const levelMap: Record<string, string> = {
    privilege: "Privilege",
    guld: "Priority",
    silver: "Premium",
    brons: "Plus",
    basic: "Basic",
  };
  return levelMap[level] || level.charAt(0).toUpperCase() + level.slice(1);
};

const getLevelColors = (level: string) => {
  const colorMap: Record<string, { badge: string; text: string }> = {
    privilege: {
      badge: "bg-gradient-to-br from-[#2F0E15] to-[#1a080b]",
      text: "text-white",
    },
    guld: {
      badge: "bg-gradient-to-br from-[#E4CAA0] to-[#c9a86c]",
      text: "text-gray-900",
    },
    silver: {
      badge: "bg-gradient-to-br from-emerald-800 to-emerald-950",
      text: "text-white",
    },
    brons: {
      badge: "bg-gradient-to-br from-indigo-700 to-indigo-950",
      text: "text-white",
    },
    basic: {
      badge: "bg-gradient-to-br from-slate-600 to-slate-800",
      text: "text-white",
    },
  };
  return colorMap[level] || colorMap.basic;
};

// Default discount percentages
const getDefaultDiscount = (level: string): number => {
  const discountMap: Record<string, number> = {
    privilege: 15,
    guld: 10,
    silver: 5,
    brons: 3,
    basic: 0,
  };
  return discountMap[level] || 0;
};

export function MembershipsClient({
  perksByLevel: initialPerksByLevel,
  levelThresholds,
  inviteQuotas,
}: MembershipsClientProps) {
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [quotaValue, setQuotaValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [perksByLevel, setPerksByLevel] = useState(initialPerksByLevel);

  const levels = ["basic", "brons", "silver", "guld", "privilege"];

  const getCurrentDiscount = (level: string): number => {
    const perks = perksByLevel[level as keyof typeof perksByLevel] || [];
    const discountPerk = perks.find((p) => p.perk_type === "discount");
    if (discountPerk?.perk_value) {
      const match = discountPerk.perk_value.match(/(\d+)/);
      return match ? parseInt(match[1]) : getDefaultDiscount(level);
    }
    return getDefaultDiscount(level);
  };

  const handleEditClick = (level: string) => {
    setEditingLevel(level);
    setDiscountValue(getCurrentDiscount(level));
    setQuotaValue(inviteQuotas[level]);
  };

  const handleSave = async () => {
    if (!editingLevel) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/memberships/${editingLevel}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discount: discountValue,
          inviteQuota: quotaValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      toast.success("Configuration updated successfully");

      // Refresh page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23] mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
          Membership Levels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {levels.map((level) => {
            const perks = perksByLevel[level as keyof typeof perksByLevel] || [];
            const threshold = levelThresholds[
              level as keyof typeof levelThresholds
            ] || { min: 0, max: 0 };
            const quota = inviteQuotas[level];
            const colors = getLevelColors(level);

            return (
              <div
                key={level}
                className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-4 hover:border-gray-200 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${colors.badge} ${colors.text}`}
                  >
                    {getLevelName(level)}
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(level)}
                        className="rounded-lg h-8 w-8 p-0 border-gray-200 dark:border-zinc-700"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      aria-describedby="edit-membership-description"
                      className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
                    >
                      <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-zinc-100">
                          Edit {getLevelName(level)} Membership
                        </DialogTitle>
                        <p
                          id="edit-membership-description"
                          className="text-sm text-gray-600 dark:text-zinc-400 mt-2"
                        >
                          Configure discount percentage and invite quota for
                          this membership level
                        </p>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="discount" className="text-gray-900 dark:text-zinc-100">
                            Member Discount (%)
                          </Label>
                          <Input
                            id="discount"
                            type="number"
                            min="0"
                            max="100"
                            value={discountValue}
                            onChange={(e) =>
                              setDiscountValue(Number(e.target.value))
                            }
                            className="mt-1.5"
                          />
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                            Discount applied to all wine purchases
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="quota" className="text-gray-900 dark:text-zinc-100">
                            Monthly Invite Quota
                          </Label>
                          <Input
                            id="quota"
                            type="number"
                            min="0"
                            value={quotaValue}
                            onChange={(e) =>
                              setQuotaValue(Number(e.target.value))
                            }
                            className="mt-1.5"
                          />
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                            Number of invites per month
                          </p>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setEditingLevel(null)}
                            disabled={saving}
                            className="flex-1 rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5 mr-2" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-0.5">
                        IP Threshold
                      </p>
                      <p className="text-xs font-medium text-gray-900 dark:text-zinc-100">
                        {threshold.min} -{" "}
                        {threshold.max === Infinity ? "∞" : threshold.max} pts
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-0.5">
                        Invite Quota
                      </p>
                      <p className="text-xs font-medium text-gray-900 dark:text-zinc-100">
                        {quota === 999999 ? "Unlimited" : `${quota}/month`}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-0.5">
                      Member Discount
                    </p>
                    <p className="text-xs font-medium text-gray-900 dark:text-zinc-100">
                      {getCurrentDiscount(level)}%
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-1.5">
                      Active Perks
                    </p>
                    <div className="space-y-1.5">
                      {perks.length > 0 ? (
                        perks.map((perk) => (
                          <div
                            key={perk.id}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 flex-shrink-0">
                              {perk.perk_type}
                            </span>
                            <span className="text-gray-600 dark:text-zinc-400">
                              {perk.description}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                          No perks configured
                        </p>
                      )}
                    </div>
                  </div>

                  {perks.find((p) => p.perk_type === "fee_reduction") && (
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-0.5">
                        Service Fee
                      </p>
                      <p className="text-xs font-medium text-gray-900 dark:text-zinc-100">
                        {
                          perks.find((p) => p.perk_type === "fee_reduction")
                            ?.perk_value
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-2">
          Membership System Configuration
        </h3>
        <div className="space-y-1 text-xs text-gray-600 dark:text-zinc-400">
          <p>• IP Thresholds and Invite Quotas are currently hardcoded in code</p>
          <p>• Perks are stored in the database and can be managed</p>
          <p>• Member discounts apply to all wine purchases</p>
          <p>• Click Edit on any level to modify discount and quota settings</p>
        </div>
      </div>
    </>
  );
}
