"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
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
import { deleteTask } from "@/lib/actions/operations"

interface Props {
  taskId: string
  /** Om satt: efter radering till projektets sida (annars tasks-listan). */
  projectId?: string | null
}

export function TaskDetailDelete({ taskId, projectId = null }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    try {
      await deleteTask(taskId)
      toast.success("Task deleted")
      const href =
        projectId != null && projectId !== ""
          ? `/admin/operations/projects/${projectId}`
          : "/admin/operations/tasks"
      router.push(href)
      router.refresh()
    } catch {
      toast.error("Failed to delete task")
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200/80 bg-red-50/60 px-3 py-2 dark:border-red-900/35 dark:bg-red-950/15">
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-red-800/85 dark:text-red-300/85">
          Soft-delete — kan återställas vid behov.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 border-red-300/90 bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700 hover:text-white dark:border-red-800 dark:bg-red-700 dark:hover:bg-red-600"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Ta bort
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-xl border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-zinc-100">
              Delete task?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-zinc-400">
              This will soft-delete the task. It can be recovered if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs font-medium">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleDelete()
              }}
              className="rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
