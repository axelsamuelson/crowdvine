"use client";

import { Suspense, type ReactNode } from "react";
import { AnalyticsFilterBar } from "./analytics-filter-bar";

export function AnalyticsPageShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>
      <Suspense
        fallback={
          <div className="admin-skel h-20 w-full rounded-xl" aria-hidden />
        }
      >
        <AnalyticsFilterBar />
      </Suspense>
      {children}
    </div>
  );
}
