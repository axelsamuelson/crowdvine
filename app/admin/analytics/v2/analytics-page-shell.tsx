"use client";

import { Suspense, type ReactNode } from "react";
import { AnalyticsFilterBar } from "./analytics-filter-bar";
import { HowWeCountButton } from "./how-we-count-panel";

export function AnalyticsPageShell({
  title,
  subtitle,
  children,
  actions,
  forceSite,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
  forceSite?: "pact" | "dirtywine";
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          <HowWeCountButton />
        </div>
      </div>
      <Suspense
        fallback={
          <div className="admin-skel h-12 w-full rounded-xl" aria-hidden />
        }
      >
        <AnalyticsFilterBar forceSite={forceSite} />
      </Suspense>
      {children}
    </div>
  );
}
