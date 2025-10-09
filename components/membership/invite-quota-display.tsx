import { Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteQuotaDisplayProps {
  available: number;
  total: number;
  used: number;
  resetsIn?: {
    days: number;
    hours: number;
  };
  className?: string;
}

export function InviteQuotaDisplay({
  available,
  total,
  used,
  resetsIn,
  className,
}: InviteQuotaDisplayProps) {
  const percentUsed = total > 0 ? (used / total) * 100 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quota Stats */}
      <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Monthly Invites</p>
            <p className="text-2xl font-semibold text-gray-900">
              {available}
              <span className="text-base text-gray-500 font-normal ml-1">/ {total}</span>
            </p>
          </div>
        </div>

        {/* Reset Timer */}
        {resetsIn && (
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-xs">Resets in</span>
            </div>
            <p className="text-sm font-medium text-gray-700">
              {resetsIn.days}d {resetsIn.hours}h
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {used} used
          </span>
          <span className="text-xs text-gray-500">
            {available} remaining
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              percentUsed >= 90 ? "bg-red-500" : percentUsed >= 70 ? "bg-yellow-500" : "bg-green-500"
            )}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Warning if low */}
      {available <= 1 && available > 0 && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-800">
            Only {available} invite{available !== 1 ? 's' : ''} remaining this month
          </p>
        </div>
      )}

      {/* Depleted */}
      {available === 0 && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            You've used all invites for this month. Quota resets on the 1st.
          </p>
        </div>
      )}
    </div>
  );
}

