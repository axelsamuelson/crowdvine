"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Pencil, X } from "lucide-react"
import { updateTask } from "@/lib/actions/operations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function TaskDetailTitleEditor({
  taskId,
  initialTitle,
}: {
  taskId: string
  initialTitle: string
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialTitle)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(initialTitle)
    setDraft(initialTitle)
  }, [initialTitle])

  async function save() {
    const next = draft.trim()
    if (!next) {
      toast.error("Title cannot be empty")
      setDraft(title)
      return
    }
    if (next === title) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await updateTask(taskId, { title: next })
      setTitle(next)
      setEditing(false)
      toast.success("Saved")
      router.refresh()
    } catch {
      toast.error("Failed to save")
      setDraft(title)
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDraft(title)
    setEditing(false)
  }

  return (
    <div className="flex min-w-0 items-start gap-2">
      {editing ? (
        <>
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            className={cn(
              "min-w-0 flex-1 text-xl font-semibold sm:text-2xl",
              "h-auto min-h-10 py-2 rounded-lg border-gray-200 dark:border-[#1F1F23]",
              "bg-white dark:bg-zinc-900/40 text-gray-900 dark:text-zinc-100"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void save()
              }
              if (e.key === "Escape") cancel()
            }}
          />
          <div className="flex shrink-0 gap-1 pt-0.5">
            <Button
              type="button"
              size="icon"
              variant="default"
              className={cn(
                "size-9 shrink-0 border-0 shadow-sm",
                "bg-emerald-600 text-white hover:bg-emerald-700",
                "dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400",
                "focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2",
                "dark:focus-visible:ring-offset-[#0F0F12]"
              )}
              disabled={saving}
              aria-label="Save title"
              onClick={() => void save()}
            >
              <Check className="size-4 stroke-[2.5]" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className={cn(
                "size-9 shrink-0 border-gray-300 bg-white text-gray-700",
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
        </>
      ) : (
        <>
          <h1 className="min-w-0 flex-1 break-words text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
            {title}
          </h1>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 shrink-0 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            aria-label="Edit title"
            onClick={() => {
              setDraft(title)
              setEditing(true)
            }}
          >
            <Pencil className="size-4" />
          </Button>
        </>
      )}
    </div>
  )
}
