"use client";

import {
  Users,
  ShoppingCart,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type Metrics28d = {
  visitors: number;
  intent_sessions: number;
  reservations: number;
  conversion_pct: number;
};

interface MetricsCardsProps {
  data: Metrics28d | null;
  loading?: boolean;
}

const DEFINITIONS: Record<string, string> = {
  Besökare:
    "Unika rena sessioner (analytics_sessions_clean) senaste 28 dagarna.",
  "Intent-sessioner":
    "Rena sessioner med varukorg eller checkout som inte konverterat (se Nära köp-definitionen).",
  Reservationer:
    "Rena sessioner som kopplats till en reservation (event eller order_reservations inom sessionfönstret) senaste 28 dagarna.",
  Konvertering:
    "Reservationer ÷ besökare (rena sessioner) senaste 28 dagarna.",
};

export function MetricsCards({ data, loading }: MetricsCardsProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Laddar metrics…
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Kunde inte ladda rena session-metrics. Kontrollera att analytics
          migrationerna är körda.
        </p>
      </div>
    );
  }

  const metrics = [
    {
      title: "Besökare",
      value: data.visitors,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Intent-sessioner",
      value: data.intent_sessions,
      icon: ShoppingCart,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      title: "Reservationer",
      value: data.reservations,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      title: "Konvertering",
      value: `${data.conversion_pct}%`,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Tooltip key={metric.title}>
            <TooltipTrigger asChild>
              <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] cursor-help">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {metric.title}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {metric.value}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                      28 dagar · rena sessioner
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${metric.bgColor} border border-gray-100 dark:border-transparent`}
                  >
                    <Icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed">
              {DEFINITIONS[metric.title]}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
