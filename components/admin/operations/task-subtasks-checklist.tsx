"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { addSubtask, updateTask } from "@/lib/actions/operations"
import type { Task, TaskStatus } from "@/lib/types/operations"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface TaskSubtasksChecklistProps {
  parentTaskId: string
  initialSubtasks: Task[]
  className?: string
}

export function TaskSubtasksChecklist({
  parentTaskId,
  initialSubtasks,
  className,
}: TaskSubtasksChecklistProps) {
  const router = useRouter()
  const [subtasks, setSubtasks] = useState(initialSubtasks)
  const [draft, setDraft] = useState("")
  const [pending, startTransition] = useTransition()

  const syncDone = (subtaskId: string, done: boolean) => {
    const status: TaskStatus = done ? "done" : "todo"
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, status } : s)),
    )
    startTransition(async () => {
      try {
        await updateTask(subtaskId, { status })
        router.refresh()
      } catch {
        router.refresh()
      }
    })
  }

  const submitNew = () => {
    const t = draft.trim()
    if (!t || pending) return
    setDraft("")
    startTransition(async () => {
      try {
        const created = await addSubtask(parentTaskId, t)
        setSubtasks((prev) =>
          [...prev, created].sort(
            (a, b) =>
              (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
              new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
          ),
        )
        router.refresh()
      } catch {
        setDraft(t)
      }
    })
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 bg-white dark:bg-[#0F0F12]",
        className,
      )}
    >
      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Subtasks
      </h2>

      <div className="space-y-2 mb-4">
        {subtasks.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Inga delsteg ännu. Lägg till nedan — när alla är avbockade sätts
            tasken till Done.
          </p>
        ) : (
          subtasks.map((sub) => {
            const done = sub.status === "done"
            return (
              <label
                key={sub.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-transparent px-1 py-1.5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer",
                  done && "opacity-80",
                )}
              >
                <Checkbox
                  checked={done}
                  disabled={pending}
                  onCheckedChange={(v) => syncDone(sub.id, v === true)}
                  className="mt-0.5"
                  aria-label={done ? "Markera som ej klar" : "Markera som klar"}
                />
                <span
                  className={cn(
                    "text-sm text-gray-800 dark:text-gray-200 min-w-0 break-words",
                    done && "line-through text-gray-500 dark:text-gray-500",
                  )}
                >
                  {sub.title}
                </span>
              </label>
            )
          })
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nytt delsteg…"
          className="sm:flex-1"
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              submitNew()
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          disabled={pending || !draft.trim()}
          onClick={submitNew}
          className="shrink-0"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            "Lägg till"
          )}
        </Button>
      </div>
    </div>
  )
}
