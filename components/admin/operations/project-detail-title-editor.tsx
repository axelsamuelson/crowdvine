"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Pencil, X } from "lucide-react"
import { updateProject } from "@/lib/actions/operations"
import type { Project } from "@/lib/types/operations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function ProjectDetailTitleEditor({
  projectId,
  initialName,
  onSaved,
}: {
  projectId: string
  initialName: string
  onSaved?: (project: Project) => void
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(initialName)
    setDraft(initialName)
  }, [initialName])

  async function save() {
    const next = draft.trim()
    if (!next) {
      toast.error("Name cannot be empty")
      setDraft(name)
      return
    }
    if (next === name) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      const updated = await updateProject(projectId, { name: next })
      setName(next)
      setEditing(false)
      toast.success("Saved")
      onSaved?.(updated)
      if (!onSaved) router.refresh()
    } catch {
      toast.error("Failed to save")
      setDraft(name)
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDraft(name)
    setEditing(false)
  }

  const titleClass = "text-xl font-semibold sm:text-2xl"

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
              "min-w-0 flex-1",
              titleClass,
              "h-auto min-h-9 py-2 rounded-lg border-gray-200 dark:border-[#1F1F23]",
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
              aria-label="Save name"
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
          <h1
            className={cn(
              "min-w-0 flex-1 break-words text-gray-900 dark:text-white",
              titleClass
            )}
          >
            {name}
          </h1>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 shrink-0 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            aria-label="Edit project name"
            onClick={() => {
              setDraft(name)
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
