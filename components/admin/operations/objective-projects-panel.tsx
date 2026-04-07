"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ObjectiveProjectListRow } from "@/components/admin/operations/objective-project-list-row"
import { CreateProjectButton } from "@/components/admin/operations/create-project-button"
import { moveProjectsToObjective } from "@/lib/actions/operations"
import type {
  AdminUserMin,
  KeyResultPickerOption,
  ObjectiveMin,
  ProjectStatus,
} from "@/lib/types/operations"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type ProjectRow = {
  id: string
  name: string
  status: ProjectStatus
  due_date?: string | null
}

interface Props {
  objectiveId: string
  projects: ProjectRow[]
  /** Tasks on this objective (used to count tasks per project). */
  taskProjectIds: string[]
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
  keyResultOptions: KeyResultPickerOption[]
}

export function ObjectiveProjectsPanel({
  objectiveId,
  projects,
  taskProjectIds,
  objectives,
  admins,
  keyResultOptions,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targetObjectiveId, setTargetObjectiveId] = useState<string>("")
  const [moving, setMoving] = useState(false)

  const targetObjectives = useMemo(
    () => objectives.filter((o) => o.id !== objectiveId),
    [objectives, objectiveId]
  )

  const taskCountByProject = useMemo(() => {
    const m = new Map<string, number>()
    for (const pid of taskProjectIds) {
      m.set(pid, (m.get(pid) ?? 0) + 1)
    }
    return m
  }, [taskProjectIds])

  const allSelected =
    projects.length > 0 && selected.size === projects.length
  const someSelected = selected.size > 0 && selected.size < projects.length

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(projects.map((p) => p.id)))
    } else {
      setSelected(new Set())
    }
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function handleMove() {
    if (selected.size === 0) return
    if (!targetObjectiveId) {
      toast.error("Choose a target objective")
      return
    }
    setMoving(true)
    try {
      await moveProjectsToObjective(
        [...selected],
        objectiveId,
        targetObjectiveId
      )
      toast.success(
        selected.size === 1
          ? "Project moved"
          : `${selected.size} projects moved`
      )
      setSelected(new Set())
      setTargetObjectiveId("")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not move projects")
    } finally {
      setMoving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-stretch sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
        <CreateProjectButton
          objectives={objectives}
          admins={admins}
          defaultObjectiveId={objectiveId}
          keyResultOptions={keyResultOptions}
          label="Add Project"
        />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
            No projects linked
          </p>
        ) : (
          <>
            <div
              className={cn(
                "flex flex-col gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-[#1F1F23] dark:bg-zinc-900/40",
                "sm:flex-row sm:flex-wrap sm:items-center"
              )}
            >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      someSelected ? "indeterminate" : allSelected
                    }
                    onCheckedChange={(v) => toggleAll(v === true)}
                    aria-label="Select all projects"
                  />
                  <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Select all
                  </span>
                </div>

                {selected.size > 0 && (
                  <>
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-xs text-gray-600 dark:text-zinc-400 shrink-0">
                        Move {selected.size} project
                        {selected.size === 1 ? "" : "s"} to
                      </span>
                      {targetObjectives.length === 0 ? (
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                          Create another objective first to move projects.
                        </span>
                      ) : (
                        <Select
                          value={targetObjectiveId || undefined}
                          onValueChange={setTargetObjectiveId}
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-9 w-full min-w-0 max-w-full border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-950 sm:max-w-xs"
                          >
                            <SelectValue placeholder="Choose objective…" />
                          </SelectTrigger>
                          <SelectContent>
                            {targetObjectives.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                <span className="line-clamp-2 text-left">
                                  {o.title}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        disabled={
                          moving ||
                          targetObjectives.length === 0 ||
                          !targetObjectiveId
                        }
                        onClick={() => void handleMove()}
                      >
                        {moving ? "Moving…" : "Move"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-xs"
                        disabled={moving}
                        onClick={() => {
                          setSelected(new Set())
                          setTargetObjectiveId("")
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </>
                )}
            </div>

            <div className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {projects.map((project) => (
                <ObjectiveProjectListRow
                  key={project.id}
                  project={project}
                  objectiveId={objectiveId}
                  taskCount={taskCountByProject.get(project.id) ?? 0}
                  selectable
                  selected={selected.has(project.id)}
                  onSelectedChange={(on) => toggleOne(project.id, on)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
