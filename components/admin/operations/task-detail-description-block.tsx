"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateTask } from "@/lib/actions/operations"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function TaskDetailDescriptionBlock({
  taskId,
  initialDescription,
}: {
  taskId: string
  initialDescription: string | null
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(initialDescription ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(initialDescription ?? "")
  }, [initialDescription, taskId])

  async function saveIfChanged() {
    const next = draft.trim() === "" ? null : draft
    const current = initialDescription ?? null
    if (next === current) return

    setSaving(true)
    try {
      await updateTask(taskId, { description: next })
      toast.success("Saved")
      router.refresh()
    } catch {
      toast.error("Failed to save")
      setDraft(initialDescription ?? "")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4 space-y-2">
      <Label
        htmlFor={`task-desc-${taskId}`}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Description
      </Label>
      <Textarea
        id={`task-desc-${taskId}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void saveIfChanged()}
        disabled={saving}
        placeholder="Optional — saves when you leave the field"
        className={cn(
          "min-h-[140px] resize-y py-2 text-sm",
          "rounded-lg border-gray-200 dark:border-[#1F1F23]",
          "bg-white dark:bg-zinc-900/40 text-gray-900 dark:text-zinc-100"
        )}
      />
      <p className="text-[11px] text-gray-500 dark:text-gray-500">
        Clear the field and blur to remove the description.
      </p>
    </div>
  )
}
