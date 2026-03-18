"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProjectFormDialog } from "./project-form-dialog"
import type { ObjectiveMin, AdminUserMin, Project } from "@/lib/types/operations"

interface Props {
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
  project?: Project | null
  defaultObjectiveId?: string | null
  label?: string
}

export function CreateProjectButton({
  objectives,
  admins,
  project,
  defaultObjectiveId,
  label = "Create Project",
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
      <ProjectFormDialog
        open={open}
        onOpenChange={setOpen}
        project={project}
        objectives={objectives}
        admins={admins}
        defaultObjectiveId={defaultObjectiveId}
      />
    </>
  )
}
