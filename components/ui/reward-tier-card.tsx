import React from "react";

interface RewardTierCardProps {
  tierPercent: 5 | 10;
  used: number;
  available: number;
  pending?: number;
}

export function RewardTierCard({ tierPercent, used, available, pending }: RewardTierCardProps) {
  return (
    <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200/50">
      <div className="space-y-3">
        {/* Tier Badge */}
        <div className="flex items-center justify-center">
          <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
            {tierPercent}%
          </span>
        </div>
        
        {/* Used and Available Stats */}
        <div className="space-y-2 text-center">
          <div className="text-sm">
            <span className="text-gray-500">Used: </span>
            <span className="font-light text-gray-900">{used}</span>
            <span className="text-gray-500"> bottles</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Available: </span>
            <span className="font-light text-gray-900">{available}</span>
            <span className="text-gray-500"> bottles</span>
          </div>
          {pending !== undefined && pending > 0 && (
            <div className="text-sm">
              <span className="text-gray-400">Pending: </span>
              <span className="font-light text-gray-600">{pending}</span>
              <span className="text-gray-400"> bottles</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
