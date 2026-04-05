"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { GoalFormDialog } from "./goal-form-dialog"
import type { Goal } from "@/lib/types/operations"

interface Props {
  goal?: Goal | null
  label?: string
}

export function CreateGoalButton({
  goal,
  label = "Create Goal",
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {label}
      </Button>
      <GoalFormDialog open={open} onOpenChange={setOpen} goal={goal} />
    </>
  )
}
