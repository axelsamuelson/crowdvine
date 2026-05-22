"use client";

import { Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";

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
  const { t } = useShoppingContext();
  const percentUsed = total > 0 ? (used / total) * 100 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">
              {t("profile.inviteQuotaMonthly")}
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {available}
              <span className="text-base text-gray-500 font-normal ml-1">
                / {total}
              </span>
            </p>
          </div>
        </div>

        {resetsIn ? (
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{t("profile.inviteQuotaResetsIn")}</span>
            </div>
            <p className="text-sm font-medium text-gray-700">
              {resetsIn.days}d {resetsIn.hours}h
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {t("profile.inviteQuotaUsed", { count: String(used) })}
          </span>
          <span className="text-xs text-gray-500">
            {t("profile.inviteQuotaRemaining", { count: String(available) })}
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              percentUsed >= 90
                ? "bg-red-500"
                : percentUsed >= 70
                  ? "bg-yellow-500"
                  : "bg-green-500",
            )}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {available <= 1 && available > 0 ? (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-800">
            {available === 1
              ? t("profile.inviteQuotaLowWarning", { count: String(available) })
              : t("profile.inviteQuotaLowWarningPlural", {
                  count: String(available),
                })}
          </p>
        </div>
      ) : null}

      {available === 0 ? (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            {t("profile.inviteQuotaDepleted")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
