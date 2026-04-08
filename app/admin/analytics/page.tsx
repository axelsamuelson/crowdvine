import Link from "next/link";
import { Suspense } from "react";
import { Settings } from "lucide-react";
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
        <Button
          asChild
          variant="outline"
          className="shrink-0 border-gray-200 dark:border-zinc-700"
        >
          <Link href="/admin/analytics/settings">
            <Settings className="mr-2 size-4" aria-hidden />
            Settings
          </Link>
        </Button>
      </div>

      <Suspense
        fallback={
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading analytics...
            </p>
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}
