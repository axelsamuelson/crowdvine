import { Suspense } from "react";
import { AnalyticsDashboard } from "./analytics-dashboard";
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Track user behavior, conversion funnels, and identify bottlenecks
        </p>
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
