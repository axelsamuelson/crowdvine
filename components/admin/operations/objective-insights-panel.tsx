"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2 } from "lucide-react"
import {
  addObjectiveInsight,
  removeObjectiveInsight,
} from "@/lib/actions/operations"
import type { ObjectiveInsight } from "@/lib/types/operations"
import { formatOpsDateTimeSv } from "@/lib/ops-datetime"

export function ObjectiveInsightsPanel({
  objectiveId,
  initialInsights,
  insightsTarget,
}: {
  objectiveId: string
  initialInsights: ObjectiveInsight[]
  insightsTarget: number
}) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [pending, startTransition] = useTransition()

  const target = Math.max(1, insightsTarget)
  const count = initialInsights.length

  function add() {
    const t = text.trim()
    if (t.length < 2) {
      toast.error("Skriv minst två tecken")
      return
    }
    startTransition(async () => {
      try {
        await addObjectiveInsight(objectiveId, t)
        setText("")
        toast.success("Insight tillagd")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Kunde inte spara")
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await removeObjectiveInsight(id, objectiveId)
        toast.success("Borttagen")
        router.refresh()
      } catch {
        toast.error("Kunde inte ta bort")
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:shadow-none">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-gray-800 dark:text-zinc-200">
            Insights
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
            Varje insight måste ha unik text (ignorerar stora/små bokstäver och
            mellanslag i början/slut). Mål: {target} st · nu: {count} st.
          </p>
        </div>
        <span className="text-xs font-medium tabular-nums text-gray-600 dark:text-zinc-300">
          {Math.min(100, Math.round((count / target) * 100))}% av målet
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={pending}
          placeholder="Skriv en ny insight…"
          rows={3}
          className="min-h-[80px] flex-1 resize-y text-sm"
        />
        <Button
          type="button"
          className="shrink-0 sm:self-stretch"
          disabled={pending || text.trim().length < 2}
          onClick={() => add()}
        >
          Lägg till
        </Button>
      </div>

      {initialInsights.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-zinc-500">
          Inga insights ännu.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 dark:divide-zinc-800">
          {initialInsights.map((row) => (
            <li
              key={row.id}
              className="flex gap-3 py-3 first:pt-0"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-zinc-100">
                  {row.body}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                  {formatOpsDateTimeSv(row.created_at)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                disabled={pending}
                aria-label="Ta bort insight"
                onClick={() => remove(row.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
