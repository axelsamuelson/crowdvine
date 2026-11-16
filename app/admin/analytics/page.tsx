import Link from "next/link";
import { Suspense } from "react";
import { Link2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { AnalyticsDashboardSkeleton } from "./components/analytics-dashboard-skeleton";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ ui?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const forceSkeleton = params.ui === "skeleton";

  return (
    <div className="space-y-4">
      {/* Header always renders inside admin layout content — chrome never unmounts. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analys
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Följ besök, konverteringstratt och flaskhalsar
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
              UTM-länkar
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-gray-200 dark:border-zinc-700"
          >
            <Link href="/admin/analytics/settings">
              <Settings className="mr-2 size-4" aria-hidden />
              Inställningar
            </Link>
          </Button>
        </div>
      </div>

      {forceSkeleton ? (
        <AnalyticsDashboardSkeleton />
      ) : (
        <Suspense fallback={<AnalyticsDashboardSkeleton />}>
          <AnalyticsDashboard />
        </Suspense>
      )}
    </div>
  );
}
