"use client"

import { useState } from "react"
import { TasksViewToggle } from "./tasks-view-toggle"
import { TaskTable } from "./task-table"
import { TaskBoard } from "./task-board"
import type {
  Task,
  ProjectMin,
  ObjectiveMin,
  AdminUserMin,
} from "@/lib/types/operations"

interface Props {
  tasks: Task[]
  projects: ProjectMin[]
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
}

export function TasksViewContainer({
  tasks,
  projects,
  objectives,
  admins,
}: Props) {
  const [view, setView] = useState<"table" | "board">("table")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <TasksViewToggle onViewChange={setView} />
      </div>

      {view === "table" ? (
        <TaskTable
          tasks={tasks}
          projects={projects}
          objectives={objectives}
          admins={admins}
        />
      ) : (
        <TaskBoard tasks={tasks} />
      )}
    </div>
  )
}
