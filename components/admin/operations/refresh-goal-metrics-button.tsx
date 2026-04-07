"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { refreshGoalMetrics } from "@/lib/actions/metrics"
import { Loader2 } from "lucide-react"

type Props = {
  goalId: string
  label?: string
}

export function RefreshGoalMetricsButton({
  goalId,
  label = "Uppdatera metrics",
}: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await refreshGoalMetrics(goalId)
          router.refresh()
        })
      }}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-gray-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
      ) : null}
      {label}
    </button>
  )
}
