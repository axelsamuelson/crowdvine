"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, Save, Loader2 } from "lucide-react";
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
    admin: Perk[];
  };
  levelThresholds: any;
  inviteQuotas: any;
}

// Helper functions matching invitation page
const getLevelName = (level: string) => {
  const levelMap: Record<string, string> = {
    'guld': 'Gold',
    'silver': 'Silver',
    'brons': 'Bronze',
    'basic': 'Basic',
    'admin': 'Admin'
  };
  return levelMap[level] || level.charAt(0).toUpperCase() + level.slice(1);
};

const getLevelColors = (level: string) => {
  const colorMap: Record<string, { badge: string; text: string }> = {
    'guld': { badge: 'bg-gradient-to-br from-amber-600 to-yellow-700', text: 'text-white' },
    'silver': { badge: 'bg-gradient-to-br from-gray-400 to-gray-500', text: 'text-gray-900' },
    'brons': { badge: 'bg-gradient-to-br from-orange-800 to-amber-900', text: 'text-white' },
    'basic': { badge: 'bg-gradient-to-br from-slate-600 to-slate-700', text: 'text-white' },
    'admin': { badge: 'bg-gradient-to-br from-purple-600 to-purple-700', text: 'text-white' },
  };
  return colorMap[level] || colorMap.basic;
};

// Default discount percentages
const getDefaultDiscount = (level: string): number => {
  const discountMap: Record<string, number> = {
    'guld': 10,
    'silver': 5,
    'brons': 3,
    'basic': 0,
    'admin': 15,
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

  const levels = ['basic', 'brons', 'silver', 'guld', 'admin'];

  const getCurrentDiscount = (level: string): number => {
    const perks = perksByLevel[level as keyof typeof perksByLevel] || [];
    const discountPerk = perks.find(p => p.perk_type === 'discount');
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount: discountValue,
          inviteQuota: quotaValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
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
      {/* Membership Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {levels.map((level) => {
          const perks = perksByLevel[level as keyof typeof perksByLevel] || [];
          const threshold = levelThresholds[level as keyof typeof levelThresholds] || { min: 0, max: 0 };
          const quota = inviteQuotas[level];
          const colors = getLevelColors(level);

          return (
            <Card key={level} className="border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  {/* Level Badge */}
                  <div className={`px-4 py-2 rounded-md text-sm font-medium ${colors.badge} ${colors.text}`}>
                    {getLevelName(level)} Membership
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditClick(level)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit {getLevelName(level)} Membership</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="discount">Member Discount (%)</Label>
                          <Input
                            id="discount"
                            type="number"
                            min="0"
                            max="100"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(Number(e.target.value))}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Discount applied to all wine purchases
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="quota">Monthly Invite Quota</Label>
                          <Input
                            id="quota"
                            type="number"
                            min="0"
                            value={quotaValue}
                            onChange={(e) => setQuotaValue(Number(e.target.value))}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Number of invites per month
                          </p>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setEditingLevel(null)}
                            disabled={saving}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-black hover:bg-black/90 text-white"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* IP Threshold */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">IP Threshold</p>
                    <p className="text-sm font-medium text-gray-900">
                      {threshold.min} - {threshold.max === Infinity ? '∞' : threshold.max} points
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Invite Quota</p>
                    <p className="text-sm font-medium text-gray-900">
                      {quota === 999999 ? 'Unlimited' : `${quota}/month`}
                    </p>
                  </div>
                </div>

                {/* Member Discount */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Member Discount</p>
                  <p className="text-sm font-medium text-gray-900">
                    {getCurrentDiscount(level)}%
                  </p>
                </div>

                {/* Perks List */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Active Perks</p>
                  <div className="space-y-2">
                    {perks.length > 0 ? (
                      perks.map(perk => (
                        <div key={perk.id} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="text-xs mt-0.5 flex-shrink-0">
                            {perk.perk_type}
                          </Badge>
                          <span className="text-gray-600 text-xs">{perk.description}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">No perks configured</p>
                    )}
                  </div>
                </div>

                {/* Fee Reduction (from perks) */}
                {perks.find(p => p.perk_type === 'fee_reduction') && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Service Fee</p>
                    <p className="text-sm font-medium text-gray-900">
                      {perks.find(p => p.perk_type === 'fee_reduction')?.perk_value}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <Card className="border border-gray-200 bg-blue-50">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Membership System Configuration
          </h3>
          <div className="space-y-1 text-xs text-gray-600">
            <p>• IP Thresholds and Invite Quotas are currently hardcoded in code</p>
            <p>• Perks are stored in the database and can be managed</p>
            <p>• Member discounts apply to all wine purchases</p>
            <p>• Click Edit on any level to modify discount and quota settings</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

