"use client"

import { useEffect, useId, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import type { DriftTaskDetail } from "@/lib/operations/drift/types"
import { cn } from "@/lib/utils"

interface Props {
  detail: DriftTaskDetail | null
  open: boolean
  onClose: () => void
  onShowInPipeline: (projectId: string | null) => void
}

/** Spec v4.1 secondary outline — must include `border` (color alone is invisible). */
const PANEL_OUTLINE_BUTTON_CLASS =
  "inline-flex h-11 w-full items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"

const PANEL_PRIMARY_BUTTON_CLASS =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 text-xs font-medium text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"

export function DriftDetailPanel({
  detail,
  open,
  onClose,
  onShowInPipeline,
}: Props) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!mounted || !open || !detail) return null

  const ownerLabel = detail.owner?.trim() || "Utan ägare"
  const ownerMuted = !detail.owner?.trim()

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Stäng detaljpanel"
        onClick={onClose}
      />

      {/* One shell: bottom sheet on mobile, right side panel on lg+ (avoids duplicate ids). */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col overflow-hidden rounded-t-xl border border-gray-200 bg-white shadow-xl dark:border-[#1F1F23] dark:bg-[#0F0F12]",
          "lg:inset-y-0 lg:bottom-auto lg:left-auto lg:right-0 lg:h-full lg:w-[28rem] lg:max-h-none lg:rounded-none lg:border-l lg:border-t-0 lg:border-r-0 lg:border-b-0",
        )}
      >
        <div className="flex justify-center pt-2 lg:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-zinc-600" />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-[#1F1F23]">
          <h2
            id={titleId}
            className="min-w-0 flex-1 text-base font-semibold leading-snug text-gray-900 dark:text-white"
          >
            {detail.heading}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Stäng"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {detail.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
              {detail.description}
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Ingen beskrivning.
            </p>
          )}

          <dl className="mt-5 space-y-3 border-t border-gray-200 pt-4 dark:border-[#1F1F23]">
            <MetaRow label="Ägare" value={ownerLabel} muted={ownerMuted} />
            <MetaRow label="Projekt" value={detail.projectName || "—"} />
            <MetaRow label="Status" value={detail.statusLabel} />
            <MetaRow label="Datum" value={detail.dateLabel || "—"} />
          </dl>
        </div>

        <div className="space-y-2 border-t border-gray-200 px-5 py-4 dark:border-[#1F1F23]">
          {detail.prUrl && detail.prNumber != null ? (
            <a
              href={detail.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={PANEL_OUTLINE_BUTTON_CLASS}
            >
              Öppna PR #{detail.prNumber}
            </a>
          ) : null}
          <button
            type="button"
            className={PANEL_PRIMARY_BUTTON_CLASS}
            onClick={() => onShowInPipeline(detail.projectId)}
          >
            Visa i Pipeline
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function MetaRow({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-gray-500 dark:text-zinc-400">{label}</dt>
      <dd
        className={cn(
          "text-right text-sm font-medium",
          muted
            ? "text-gray-500 dark:text-zinc-400"
            : "text-gray-900 dark:text-white",
        )}
      >
        {value}
      </dd>
    </div>
  )
}
