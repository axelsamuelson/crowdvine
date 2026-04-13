"use client"

/**
 * Visar när och av vem något skapades (operations: objectives, projects, tasks).
 */

import {
  formatOpsDateOnlySv,
  formatOpsDateTimeSv,
} from "@/lib/ops-datetime"
import { cn } from "@/lib/utils"
import { taskDetailPrimaryLabelClass } from "@/components/admin/operations/task-detail-primary-label"

export { formatOpsDateTimeSv, formatOpsDateOnlySv } from "@/lib/ops-datetime"

export function CreatedMetaLine({
  createdAt,
  creatorEmail,
  className = "",
  showUnknownIfNoCreator = false,
  dueDate,
  completedAt,
  /** Task detalj: etiketten Skapad: samma stil som Status / Tilldelade. */
  taskDetailPrimaryLabels = false,
}: {
  createdAt: string | null | undefined
  creatorEmail?: string | null
  className?: string
  showUnknownIfNoCreator?: boolean
  dueDate?: string | null
  completedAt?: string | null
  taskDetailPrimaryLabels?: boolean
}) {
  if (!createdAt) return null
  const when = formatOpsDateTimeSv(createdAt)
  const who = creatorEmail?.trim() || null
  const due = dueDate?.trim() ? formatOpsDateOnlySv(dueDate) : null
  const done = completedAt?.trim() ? formatOpsDateTimeSv(completedAt) : null

  return (
    <p
      className={`text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 ${className}`.trim()}
    >
      <span
        className={cn(
          taskDetailPrimaryLabels
            ? taskDetailPrimaryLabelClass
            : "font-medium text-zinc-800 dark:text-zinc-200",
        )}
      >
        Skapad:
      </span>{" "}
      {when}
      {who ? (
        <>
          {" "}
          · <span title={who}>{who}</span>
        </>
      ) : showUnknownIfNoCreator ? (
        <span className="text-zinc-500 dark:text-zinc-500"> · Okänd användare</span>
      ) : null}
      {due ? (
        <>
          {" "}
          ·{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Förfaller:
          </span>{" "}
          {due}
        </>
      ) : null}
      {done ? (
        <>
          {" "}
          ·{" "}
          <span className="font-medium text-green-700 dark:text-green-400">
            Slutförd:
          </span>{" "}
          {done}
        </>
      ) : null}
    </p>
  )
}
