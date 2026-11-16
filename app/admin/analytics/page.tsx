import Link from "next/link";
import { Suspense } from "react";
import { Link2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsDashboard } from "./analytics-dashboard";
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Track user behavior, conversion funnels, and identify bottlenecks
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            asChild
            variant="outline"
            className="border-gray-200 dark:border-zinc-700"
          >
            <Link href="/admin/analytics/links">
              <Link2 className="mr-2 size-4" aria-hidden />
              UTM links
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-gray-200 dark:border-zinc-700"
          >
            <Link href="/admin/analytics/settings">
              <Settings className="mr-2 size-4" aria-hidden />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      <Suspense
        fallback={
          <div
            className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] space-y-4"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="h-4 w-40 rounded bg-gray-100 dark:bg-zinc-800 animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg bg-gray-100 dark:bg-zinc-800 animate-pulse"
                />
              ))}
            </div>
            <div className="h-64 rounded-lg bg-gray-100 dark:bg-zinc-800 animate-pulse" />
            <p className="sr-only">Laddar analytics…</p>
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}
