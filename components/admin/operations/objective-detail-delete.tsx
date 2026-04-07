"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteObjective } from "@/lib/actions/operations"

interface Props {
  objectiveId: string
  objectiveTitle: string
  goalId?: string | null
}

export function ObjectiveDetailDelete({
  objectiveId,
  objectiveTitle,
  goalId = null,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteObjective(objectiveId)
      toast.success("Objective deleted")
      setOpen(false)
      const href =
        goalId != null && goalId !== ""
          ? `/admin/operations/goals/${goalId}`
          : "/admin/operations/objectives"
      router.push(href)
      router.refresh()
    } catch {
      toast.error("Failed to delete objective")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full rounded-lg border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4 shrink-0" aria-hidden />
        Delete objective
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-xl border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-zinc-100">
              Delete objective?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-zinc-400">
              <span className="block font-medium text-gray-800 dark:text-zinc-200">
                {objectiveTitle}
              </span>
              <span className="mt-2 block">
                The objective will be soft-deleted. Linked projects and tasks
                remain in the database but may need to be reassigned elsewhere.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-lg text-xs font-medium"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              className="rounded-lg text-xs font-medium"
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
