/**
 * Loading placeholder that mirrors AnalyticsDashboard proportions:
 * site row → 5 KPI cards → reports card (6 tabs + chart).
 * Rendered inside admin layout content only (never replaces chrome).
 */
export function AnalyticsDashboardSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-live="polite"
      data-analytics-skeleton="true"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="admin-skel h-9 w-56 rounded-lg" />
        <div className="admin-skel h-3 w-64 max-w-full rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-6 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="admin-skel h-3 w-20 rounded" />
                <div className="admin-skel h-8 w-16 rounded" />
                <div className="admin-skel h-2.5 w-28 rounded" />
              </div>
              <div className="admin-skel size-10 rounded-lg shrink-0" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23]">
        <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23] space-y-4">
          <div className="admin-skel h-5 w-28 rounded" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="admin-skel h-9 w-20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="rounded-lg border border-gray-200 dark:border-[#1F1F23] p-3 space-y-2">
              <div className="admin-skel h-3 w-16 rounded" />
              <div className="admin-skel h-7 w-14 rounded" />
              <div className="admin-skel h-2.5 w-24 rounded" />
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-[#1F1F23] p-3 space-y-2">
              <div className="admin-skel h-3 w-16 rounded" />
              <div className="admin-skel h-7 w-14 rounded" />
              <div className="admin-skel h-2.5 w-24 rounded" />
            </div>
          </div>
          <div className="admin-skel h-72 w-full rounded-lg" />
        </div>
      </div>

      <p className="sr-only">Laddar analys…</p>
    </div>
  );
}
