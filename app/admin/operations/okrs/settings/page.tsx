import Link from "next/link"
import { ArrowLeft, SlidersHorizontal } from "lucide-react"
import { listMetricExcludedProfiles } from "@/lib/actions/metrics-exclusions"
import { MetricsExclusionsSettings } from "@/components/admin/operations/metrics-exclusions-settings"

export default async function OkrsMetricsSettingsPage() {
  const rows = await listMetricExcludedProfiles()

  return (
    <div className="space-y-6">
      <Link
        href="/admin/operations/okrs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-800 hover:text-gray-950 dark:text-zinc-300 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        Objectives
      </Link>

      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-gray-200 p-2 dark:bg-zinc-800">
          <SlidersHorizontal className="h-5 w-5 text-gray-900 dark:text-zinc-100" />
        </div>
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-bold text-gray-950 dark:text-zinc-50 sm:text-2xl">
            Objectives — inställningar
          </h1>
          <p className="max-w-xl text-sm text-gray-700 dark:text-zinc-300">
            Exkludera användare från metrics som matar goals och objectives
            (events, registreringar och order kopplade till deras konto).
          </p>
        </div>
      </div>

      <MetricsExclusionsSettings initialRows={rows} />
    </div>
  )
}
