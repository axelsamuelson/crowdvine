"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ObjectiveFormDialog } from "./objective-form-dialog"
import type { AdminUserMin, GoalMin, Objective } from "@/lib/types/operations"

interface Props {
  admins: AdminUserMin[]
  goals?: GoalMin[]
  defaultGoalId?: string | null
  objective?: Objective | null
  label?: string
}

export function CreateObjectiveButton({
  admins,
  goals = [],
  defaultGoalId = null,
  objective,
  label = "Create Objective",
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
      <ObjectiveFormDialog
        open={open}
        onOpenChange={setOpen}
        objective={objective}
        admins={admins}
        goals={goals}
        defaultGoalId={defaultGoalId}
      />
    </>
  )
}
