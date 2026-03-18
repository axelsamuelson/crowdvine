"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TaskFormDialog } from "./task-form-dialog"
import type {
  ProjectMin,
  ObjectiveMin,
  AdminUserMin,
} from "@/lib/types/operations"

interface Props {
  projects: ProjectMin[]
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
  defaultProjectId?: string | null
  defaultObjectiveId?: string | null
  label?: string
}

export function CreateTaskButton({
  projects,
  objectives,
  admins,
  defaultProjectId,
  defaultObjectiveId,
  label = "Create Task",
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
      <TaskFormDialog
        open={open}
        onOpenChange={setOpen}
        projects={projects}
        objectives={objectives}
        admins={admins}
        defaultProjectId={defaultProjectId}
        defaultObjectiveId={defaultObjectiveId}
      />
    </>
  )
}
