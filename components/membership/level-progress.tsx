import { cn } from "@/lib/utils";
import { TrendingUp, Sparkles } from "lucide-react";

interface LevelProgressProps {
  currentPoints: number;
  currentLevelMin: number;
  nextLevelMin: number;
  nextLevelName: string;
  activeBuffPercentage?: number; // v2: show active progression buffs
  className?: string;
}

export function LevelProgress({
  currentPoints,
  currentLevelMin,
  nextLevelMin,
  nextLevelName,
  activeBuffPercentage = 0,
  className,
}: LevelProgressProps) {
  const pointsInLevel = currentPoints - currentLevelMin;
  const pointsNeeded = nextLevelMin - currentLevelMin;
  const progress = Math.min(100, (pointsInLevel / pointsNeeded) * 100);
  const remaining = Math.max(0, nextLevelMin - currentPoints);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Bar - FIFA/XP Style */}
      <div className="relative">
        {/* Background */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          {/* Fill with gradient */}
          <div
            className="h-full bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer effect (FIFA-style) */}
            <div className="absolute inset-0 opacity-40">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                style={{ 
                  animation: "shimmer 2s ease-in-out infinite",
                  backgroundSize: "200% 100%"
                }} 
              />
            </div>
            
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </div>

        {/* Points markers with percentage */}
        <div className="flex justify-between items-center mt-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {currentPoints} IP
            </span>
            <span className="text-xs text-gray-500">
              ({progress.toFixed(0)}%)
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {nextLevelMin} IP
          </span>
        </div>
      </div>

      {/* Next Level Info - Enhanced */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <TrendingUp className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Next Level</p>
            <p className="text-base font-semibold text-gray-900">{nextLevelName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{remaining}</p>
          <p className="text-xs text-gray-500 font-medium">IP to go</p>
        </div>
      </div>

      {/* Active Progression Buff Indicator (v2) */}
      {activeBuffPercentage > 0 && (
        <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-700">
            Active bonus: +{activeBuffPercentage.toFixed(1)}% on next order
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}


