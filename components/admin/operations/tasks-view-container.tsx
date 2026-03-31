"use client"

import { useState, useEffect } from "react"
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

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const q =
      "(min-width: 768px) and (hover: hover) and (pointer: fine)" as const
    const mq = (s: string) =>
      typeof window !== "undefined" && window.matchMedia(s).matches
    // #region agent log
    fetch("/api/debug/agent-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "aae6fd",
        hypothesisId: "H1",
        location: "tasks-view-container.tsx:view+mq",
        message: "tasks view and matchMedia",
        data: {
          view,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          mqMin768: mq("(min-width: 768px)"),
          mqHover: mq("(hover: hover)"),
          mqFine: mq("(pointer: fine)"),
          mqWholeCard: mq(q),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
  }, [view])

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex justify-stretch sm:justify-end">
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
