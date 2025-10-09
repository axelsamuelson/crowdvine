import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface LevelProgressProps {
  currentPoints: number;
  currentLevelMin: number;
  nextLevelMin: number;
  nextLevelName: string;
  className?: string;
}

export function LevelProgress({
  currentPoints,
  currentLevelMin,
  nextLevelMin,
  nextLevelName,
  className,
}: LevelProgressProps) {
  const pointsInLevel = currentPoints - currentLevelMin;
  const pointsNeeded = nextLevelMin - currentLevelMin;
  const progress = Math.min(100, (pointsInLevel / pointsNeeded) * 100);
  const remaining = Math.max(0, nextLevelMin - currentPoints);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Bar */}
      <div className="relative">
        {/* Background */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          {/* Fill */}
          <div
            className="h-full bg-gradient-to-r from-gray-800 to-gray-900 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer on progress bar */}
            <div className="absolute inset-0 opacity-30">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                style={{ 
                  animation: "shimmer 2s ease-in-out infinite",
                  backgroundSize: "200% 100%"
                }} 
              />
            </div>
          </div>
        </div>

        {/* Points markers */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            {currentPoints} IP
          </span>
          <span className="text-xs font-medium text-gray-700">
            {nextLevelMin} IP
          </span>
        </div>
      </div>

      {/* Next Level Info */}
      <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-200/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-gray-700" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Next Level</p>
            <p className="text-sm font-medium text-gray-900">{nextLevelName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{remaining} IP</p>
          <p className="text-xs text-gray-500">to go</p>
        </div>
      </div>

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

