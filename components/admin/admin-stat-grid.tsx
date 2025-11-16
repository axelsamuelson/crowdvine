import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type AdminStat = {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  icon?: LucideIcon;
};

interface AdminStatGridProps {
  stats: AdminStat[];
  className?: string;
}

export function AdminStatGrid({ stats, className }: AdminStatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-100 bg-white/70 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {stat.label}
                </p>
                <p className="text-3xl font-semibold text-slate-900">
                  {stat.value}
                </p>
                {stat.helper && (
                  <p className="text-xs text-slate-500">{stat.helper}</p>
                )}
              </div>
              {Icon && <Icon className="h-10 w-10 text-slate-300" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

