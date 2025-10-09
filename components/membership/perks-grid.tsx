import { Check, Lock, Zap, Users, Calendar, Trophy, Shield, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Perk {
  perk_type: string;
  perk_value: string;
  description: string;
}

interface PerksGridProps {
  perks: Perk[];
  className?: string;
}

const perkIcons: Record<string, any> = {
  invite_quota: Users,
  queue_priority: Zap,
  fee_reduction: Trophy,
  early_access: Calendar,
  exclusive_drops: Star,
  pallet_hosting: Shield,
  producer_contact: Shield,
};

export function PerksGrid({ perks, className }: PerksGridProps) {
  if (!perks || perks.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-3", className)}>
      {perks.map((perk, index) => {
        const Icon = perkIcons[perk.perk_type] || Check;
        
        return (
          <div
            key={index}
            className="flex items-start gap-3 p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 hover:bg-gray-100/50 transition-colors"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-gray-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-0.5">
                {perk.description}
              </p>
              {perk.perk_value && perk.perk_value !== 'true' && (
                <p className="text-xs text-gray-500">
                  {perk.perk_value}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface LockedPerksProps {
  nextLevelPerks?: Perk[];
  nextLevelName?: string;
  className?: string;
}

export function LockedPerks({ nextLevelPerks, nextLevelName, className }: LockedPerksProps) {
  if (!nextLevelPerks || nextLevelPerks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
        <Lock className="w-4 h-4" />
        Unlock at {nextLevelName}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {nextLevelPerks.slice(0, 4).map((perk, index) => {
          const Icon = perkIcons[perk.perk_type] || Check;
          
          return (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-gray-50/30 rounded-xl border border-gray-200/30 opacity-50"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 mb-0.5">
                  {perk.description}
                </p>
                {perk.perk_value && perk.perk_value !== 'true' && (
                  <p className="text-xs text-gray-400">
                    {perk.perk_value}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

