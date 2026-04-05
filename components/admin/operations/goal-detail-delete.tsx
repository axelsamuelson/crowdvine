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
import { deleteGoal } from "@/lib/actions/operations"

interface Props {
  goalId: string
}

export function GoalDetailDelete({ goalId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    try {
      await deleteGoal(goalId)
      toast.success("Goal removed")
      router.push("/admin/operations/goals")
      router.refresh()
    } catch {
      toast.error("Failed to delete goal")
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" aria-hidden />
        Delete goal
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              Linked objectives will be unassigned from this goal (not deleted).
              The goal is soft-deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
