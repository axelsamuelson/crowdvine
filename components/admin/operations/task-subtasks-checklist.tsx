"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { addSubtask, deleteTask, updateTask } from "@/lib/actions/operations"
import type { Task, TaskStatus } from "@/lib/types/operations"
import { cn } from "@/lib/utils"
import { Check, Loader2, Pencil, Trash2 } from "lucide-react"

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [subtaskToDelete, setSubtaskToDelete] = useState<{
    id: string
    title: string
  } | null>(null)
  const [addingOpen, setAddingOpen] = useState(false)

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
        setAddingOpen(false)
        router.refresh()
      } catch {
        setDraft(t)
      }
    })
  }

  const startEdit = (sub: Task) => {
    setEditingId(sub.id)
    setEditDraft(sub.title)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft("")
  }

  const saveEdit = (subtaskId: string) => {
    const t = editDraft.trim()
    if (!t || pending) return
    startTransition(async () => {
      try {
        await updateTask(subtaskId, { title: t })
        setSubtasks((prev) =>
          prev.map((s) => (s.id === subtaskId ? { ...s, title: t } : s)),
        )
        setEditingId(null)
        setEditDraft("")
        router.refresh()
      } catch {
        router.refresh()
      }
    })
  }

  const confirmDeleteSubtask = () => {
    if (!subtaskToDelete || pending) return
    const { id } = subtaskToDelete
    const exitEditMode = editingId === id
    setSubtaskToDelete(null)
    startTransition(async () => {
      try {
        await deleteTask(id)
        setSubtasks((prev) => prev.filter((s) => s.id !== id))
        if (exitEditMode) {
          setEditingId(null)
          setEditDraft("")
        }
        toast.success("Delsteget togs bort")
        router.refresh()
      } catch {
        toast.error("Kunde inte ta bort delsteget")
        router.refresh()
      }
    })
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#0F0F12] dark:shadow-none sm:p-5",
        className,
      )}
    >
      <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
        Delsteg
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
        Kryssa eller klicka på texten för <span className="font-medium text-gray-800 dark:text-zinc-200">Att göra</span> /{" "}
        <span className="font-medium text-emerald-800 dark:text-emerald-300">Klar</span>. När alla är klara kan du sätta hela
        tasken till Done.
      </p>

      <div
        className={cn(
          "mb-4 rounded-lg border border-gray-200 bg-gray-50/90 p-1 dark:border-zinc-800 dark:bg-zinc-950",
          subtasks.length === 0 && "p-3",
        )}
      >
        {subtasks.length === 0 ? (
          <p className="text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
            Inga delsteg ännu. Lägg till längst ned.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5" role="list">
            {subtasks.map((sub) => {
              const done = sub.status === "done"
              const isEditing = editingId === sub.id

              return (
                <li
                  key={sub.id}
                  className={cn(
                    "flex items-start gap-0.5 rounded-md border border-transparent transition-colors dark:border-zinc-800/60",
                    "bg-white dark:bg-zinc-900/60",
                  )}
                >
                  {isEditing ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 p-2">
                      <Input
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className={cn(
                          "border-gray-200 bg-white text-gray-900",
                          "dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100",
                        )}
                        disabled={pending}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            saveEdit(sub.id)
                          }
                          if (e.key === "Escape") cancelEdit()
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending || !editDraft.trim()}
                          className="h-8 gap-1 border-emerald-600/40 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
                          onClick={() => saveEdit(sub.id)}
                        >
                          {pending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Spara
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          onClick={cancelEdit}
                          disabled={pending}
                        >
                          Avbryt
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          className="h-8 gap-1 border-red-300/90 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                          onClick={() =>
                            setSubtaskToDelete({
                              id: sub.id,
                              title: sub.title,
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Ta bort
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label
                        className={cn(
                          "flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-md px-2.5 py-2 transition-colors",
                          "hover:bg-gray-50 dark:hover:bg-zinc-800/80",
                          done && "opacity-95",
                        )}
                        title={
                          done
                            ? "Klicka för att markera som inte klar (Att göra)"
                            : "Klicka för att markera som klar"
                        }
                      >
                        <Checkbox
                          checked={done}
                          disabled={pending}
                          onCheckedChange={(v) => syncDone(sub.id, v === true)}
                          className="mt-0.5 border-gray-400 data-[state=checked]:border-primary dark:border-zinc-500"
                          aria-label={
                            done
                              ? "Markera delsteget som att göra"
                              : "Markera delsteget som klart"
                          }
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 break-words text-sm leading-snug",
                            done
                              ? "text-gray-500 line-through dark:text-zinc-500"
                              : "font-medium text-gray-900 dark:text-zinc-100",
                          )}
                        >
                          {sub.title}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 select-none rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            done
                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
                          )}
                          aria-hidden
                        >
                          {done ? "Klar" : "Att göra"}
                        </span>
                      </label>
                      <button
                        type="button"
                        className={cn(
                          "mt-1.5 shrink-0 rounded-md p-2 text-gray-500 transition-colors",
                          "hover:bg-gray-100 hover:text-gray-900",
                          "dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
                        )}
                        aria-label={`Redigera delsteget: ${sub.title}`}
                        disabled={pending}
                        onClick={() => startEdit(sub)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-zinc-800">
        {!addingOpen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            className="h-9 border-gray-300 bg-white text-xs font-medium text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
            onClick={() => setAddingOpen(true)}
          >
            Nytt delsteg
          </Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nytt delsteg…"
              className={cn(
                "sm:flex-1",
                "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400",
                "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500",
              )}
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submitNew()
                }
                if (e.key === "Escape") {
                  e.preventDefault()
                  setDraft("")
                  setAddingOpen(false)
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending || !draft.trim()}
                onClick={submitNew}
                className={cn(
                  "h-9 shrink-0 rounded-lg border font-medium",
                  "border-gray-800 bg-gray-900 text-white shadow-sm hover:bg-gray-800",
                  "dark:border-zinc-300 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white",
                )}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  "Lägg till"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                className="h-9 border-gray-300 bg-white text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                onClick={() => {
                  setDraft("")
                  setAddingOpen(false)
                }}
              >
                Avbryt
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={subtaskToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSubtaskToDelete(null)
        }}
      >
        <AlertDialogContent className="rounded-xl border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-zinc-100">
              Ta bort delsteg?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-zinc-400">
              {subtaskToDelete ? (
                <>
                  <span className="font-medium text-gray-800 dark:text-zinc-200">
                    {subtaskToDelete.title}
                  </span>{" "}
                  soft-raderas (kan återställas vid behov).
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs font-medium">
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirmDeleteSubtask()
              }}
              className="rounded-lg bg-red-600 text-xs font-medium hover:bg-red-700 focus:ring-red-600"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
