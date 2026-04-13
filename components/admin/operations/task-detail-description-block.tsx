"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Pencil, X } from "lucide-react"
import { updateTask } from "@/lib/actions/operations"
import type { Task } from "@/lib/types/operations"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function TaskDetailDescriptionBlock({
  taskId,
  initialDescription,
  onSaved,
  variant = "page",
  heading = "Description",
  emptyText = "No description",
}: {
  taskId: string
  initialDescription: string | null
  onSaved?: (task: Task) => void
  /** `embedded`: inuti överblick-kort, utan egen ram. */
  variant?: "page" | "sheet" | "embedded"
  heading?: string
  emptyText?: string
}) {
  const router = useRouter()
  const [description, setDescription] = useState(initialDescription ?? "")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialDescription ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const v = initialDescription ?? ""
    setDescription(v)
    setDraft(v)
  }, [initialDescription, taskId])

  function normalized(s: string) {
    const t = s.trim()
    return t === "" ? null : t
  }

  async function save() {
    const next = normalized(draft)
    const current = normalized(description)
    if (next === current) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      const updated = await updateTask(taskId, { description: next })
      setDescription(next ?? "")
      setDraft(next ?? "")
      setEditing(false)
      toast.success("Saved")
      onSaved?.(updated)
      if (!onSaved) router.refresh()
    } catch {
      toast.error("Failed to save")
      setDraft(description)
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDraft(description)
    setEditing(false)
  }

  const wrap = cn(
    variant === "embedded"
      ? "border-0 border-t border-zinc-100 bg-transparent px-5 pb-5 pt-4 shadow-none dark:border-zinc-800 sm:px-6"
      : cn(
          "border border-gray-200/90 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]",
          variant === "sheet"
            ? "rounded-lg p-3"
            : "rounded-2xl p-4 shadow-sm dark:shadow-none sm:p-5",
        ),
  )

  const iconSize =
    variant === "sheet" || variant === "embedded" ? "size-8" : "size-9"

  return (
    <div className={cn(wrap, "space-y-3")}>
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Label
            htmlFor={editing ? `task-desc-${taskId}` : undefined}
            className={cn(
              variant === "sheet"
                ? "text-sm font-medium text-gray-700 dark:text-gray-300"
                : "text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500",
            )}
          >
            {heading}
          </Label>
          {!editing && (
            <div
              className={cn(
                "text-sm text-gray-800 dark:text-zinc-200",
                "whitespace-pre-wrap break-words",
              )}
            >
              {description.trim() ? (
                description
              ) : (
                <span className="text-gray-500 dark:text-zinc-500">
                  {emptyText}
                </span>
              )}
            </div>
          )}
        </div>
        {!editing && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              "shrink-0 self-start text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100",
              iconSize
            )}
            aria-label="Edit description"
            onClick={() => {
              setDraft(description)
              setEditing(true)
            }}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>

      {editing && (
        <div className="flex min-w-0 items-start gap-2">
          <Textarea
            id={`task-desc-${taskId}`}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            placeholder="Optional"
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel()
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void save()
              }
            }}
            className={cn(
              "min-w-0 flex-1 resize-y py-2 text-sm",
              variant === "sheet"
                ? "min-h-[120px]"
                : variant === "embedded"
                  ? "min-h-[120px]"
                  : "min-h-[160px]",
              "rounded-lg border-gray-200 dark:border-[#1F1F23]",
              "bg-white dark:bg-zinc-900/40 text-gray-900 dark:text-zinc-100"
            )}
          />
          <div className="flex shrink-0 flex-col gap-1">
            <Button
              type="button"
              size="icon"
              variant="default"
              className={cn(
                "shrink-0 border-0 shadow-sm",
                iconSize,
                "bg-emerald-600 text-white hover:bg-emerald-700",
                "dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400",
                "focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2",
                "dark:focus-visible:ring-offset-[#0F0F12]"
              )}
              disabled={saving}
              aria-label="Save description"
              onClick={() => void save()}
            >
              <Check className="size-4 stroke-[2.5]" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className={cn(
                "shrink-0 border-gray-300 bg-white text-gray-700",
                iconSize,
                "hover:bg-gray-50 hover:text-gray-900",
                "dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200",
                "dark:hover:bg-zinc-800 dark:hover:text-white"
              )}
              disabled={saving}
              aria-label="Cancel"
              onClick={cancel}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <p className="text-[11px] text-gray-500 dark:text-gray-500">
          Save with the checkmark, or ⌘/Ctrl+Enter. Empty + save removes the
          description.
        </p>
      )}
    </div>
  )
}
