"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { updateTask, updateTaskAssignees } from "@/lib/actions/operations"
import type {
  TaskDetail,
  ProjectMin,
  ObjectiveMin,
  AdminUserMin,
} from "@/lib/types/operations"
import Link from "next/link"
import { ExternalLink, Pencil, X } from "lucide-react"
import { TaskDetailQuickFields } from "@/components/admin/operations/task-detail-quick-fields"
import { taskDetailPrimaryLabelClass } from "@/components/admin/operations/task-detail-primary-label"
import { adminDisplayName } from "@/lib/operations/display-admin-name"

interface Props {
  task: TaskDetail
  projects: ProjectMin[]
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
}

/** Enhetlig typografi i Detaljer-rutan (storlek + zinc-skala). */
const dt = {
  eyebrow:
    "text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500",
  title:
    "text-xs font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100",
  body: "text-xs leading-relaxed text-zinc-700 dark:text-zinc-300",
  muted: "text-xs leading-relaxed text-zinc-500 dark:text-zinc-500",
  label: "text-xs font-medium text-zinc-600 dark:text-zinc-400",
  inlineStrong: "font-medium text-zinc-800 dark:text-zinc-200",
  /** Tilldelade: (samma som Status / Skapad) */
  assigneeLabel: taskDetailPrimaryLabelClass,
} as const

export function TaskDetailActions({
  task,
  projects,
  objectives,
  admins,
}: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [objectiveId, setObjectiveId] = useState<string | null>(
    task.objective_id ?? null,
  )
  const [projectId, setProjectId] = useState<string | null>(
    task.project_id ?? null,
  )
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    setObjectiveId(task.objective_id ?? null)
    setProjectId(task.project_id ?? null)
  }, [task.objective_id, task.project_id, task.id])

  const assignedIds = useMemo(() => {
    if (task.assignees?.length) return task.assignees.map((x) => x.id)
    if (task.assigned_to) return [task.assigned_to]
    return []
  }, [task.assignees, task.assigned_to])

  const assignedAdmins = useMemo(() => {
    return assignedIds
      .map((id) => admins.find((a) => a.id === id))
      .filter((a): a is AdminUserMin => Boolean(a))
  }, [assignedIds, admins])

  const unassignedAdmins = useMemo(
    () => admins.filter((a) => !assignedIds.includes(a.id)),
    [admins, assignedIds],
  )

  const filteredProjects = useMemo(() => {
    if (objectiveId == null) return projects
    return projects.filter(
      (p) =>
        (p.objective_id ?? null) === objectiveId ||
        (projectId != null && p.id === projectId),
    )
  }, [projects, objectiveId, projectId])

  async function handleUpdate(field: string, value: string | number | null) {
    setSaving(true)
    try {
      await updateTask(task.id, { [field]: value })
      toast.success("Sparat")
      router.refresh()
    } catch {
      toast.error("Kunde inte spara")
    } finally {
      setSaving(false)
    }
  }

  async function handleObjectiveSelect(v: string) {
    const newObjectiveId = v === "__none__" ? null : v
    const currentProj =
      projectId != null ? projects.find((p) => p.id === projectId) : null
    const mustClearProject =
      currentProj != null &&
      newObjectiveId != null &&
      (currentProj.objective_id ?? null) !== newObjectiveId

    setSaving(true)
    try {
      await updateTask(task.id, {
        objective_id: newObjectiveId,
        ...(mustClearProject ? { project_id: null } : {}),
      })
      setObjectiveId(newObjectiveId)
      if (mustClearProject) setProjectId(null)
      toast.success("Sparat")
      router.refresh()
    } catch {
      toast.error("Kunde inte spara")
    } finally {
      setSaving(false)
    }
  }

  async function handleProjectSelect(v: string) {
    const newProjectId = v === "__none__" ? null : v
    setSaving(true)
    try {
      await updateTask(task.id, { project_id: newProjectId })
      setProjectId(newProjectId)
      toast.success("Sparat")
      router.refresh()
    } catch {
      toast.error("Kunde inte spara")
    } finally {
      setSaving(false)
    }
  }

  async function setAssigneeIds(next: string[]) {
    setSaving(true)
    try {
      await updateTaskAssignees(task.id, next)
      toast.success("Sparat")
      setAddOpen(false)
      router.refresh()
    } catch {
      toast.error("Kunde inte spara")
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    "h-9 text-sm rounded-lg border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100"

  return (
    <div className="h-full min-h-0 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:shadow-none sm:p-5">
      {!expanded ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={dt.eyebrow}>Detaljer</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              aria-label="Redigera detaljer"
              onClick={() => setExpanded(true)}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="space-y-3">
            <TaskDetailQuickFields
              taskId={task.id}
              status={task.status}
              priority={task.priority}
            />
          </div>

          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div className={`space-y-2 ${dt.body}`}>
              <p>
                {assignedAdmins.length === 0 ? (
                  <span className={dt.muted}>Ingen tilldelad</span>
                ) : (
                  <>
                    <span className={dt.assigneeLabel}>Tilldelade: </span>
                    <span className="break-words">
                      {assignedAdmins.map((a) => adminDisplayName(a)).join(", ")}
                    </span>
                  </>
                )}
              </p>
              {task.estimated_hours != null ? (
                <p>
                  <span className={dt.inlineStrong}>Uppskattat: </span>
                  {task.estimated_hours} h
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className={dt.title}>Redigera detaljer</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-zinc-300 bg-white text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800/90"
              onClick={() => setExpanded(false)}
            >
              Stäng
            </Button>
          </div>

          <div className="space-y-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <TaskDetailQuickFields
              taskId={task.id}
              status={task.status}
              priority={task.priority}
            />
          </div>

          {/* Assignees: endast tilldelade som taggar; lägg till via lista över övriga admins */}
          <div className="space-y-2">
            <Label className={taskDetailPrimaryLabelClass}>Tilldelade</Label>
            <p className={dt.muted}>
              Första i listan är primär för äldre filter. Ta bort med × eller
              lägg till nedan.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {assignedAdmins.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex max-w-full items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 pl-2 pr-0.5 py-0.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200"
                >
                  <span className="min-w-0 truncate" title={a.email}>
                    {adminDisplayName(a)}
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    className="rounded p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label={`Ta bort ${adminDisplayName(a)}`}
                    onClick={() =>
                      void setAssigneeIds(assignedIds.filter((id) => id !== a.id))
                    }
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
            {unassignedAdmins.length > 0 ? (
              <Popover open={addOpen} onOpenChange={setAddOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 border-zinc-200 text-xs dark:border-zinc-700"
                    disabled={saving}
                  >
                    Lägg till tilldelad
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[min(100vw-2rem,18rem)] p-2 dark:border-zinc-700 dark:bg-[#0F0F12]"
                  align="start"
                >
                  <p className={`mb-1.5 ${dt.muted}`}>Välj admin</p>
                  <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                    {unassignedAdmins.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          disabled={saving}
                          className="w-full rounded-md px-2 py-1.5 text-left text-xs text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                          onClick={() =>
                            void setAssigneeIds([...assignedIds, a.id])
                          }
                        >
                          <span className="block truncate">{adminDisplayName(a)}</span>
                          {a.full_name?.trim() ? (
                            <span className="block truncate text-xs font-normal text-zinc-500 dark:text-zinc-500">
                              {a.email}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            ) : assignedAdmins.length > 0 ? (
              <p className={dt.muted}>Alla admins är tilldelade.</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className={dt.label}>Förfallodatum</Label>
            <Input
              type="date"
              className={fieldClass}
              defaultValue={task.due_date ?? ""}
              onChange={(e) =>
                handleUpdate("due_date", e.target.value || null)
              }
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={dt.label}>Objective</Label>
            <div className="flex items-center gap-1">
              <Select
                value={objectiveId ?? "__none__"}
                onValueChange={(v) => void handleObjectiveSelect(v)}
                disabled={saving}
              >
                <SelectTrigger className={`${fieldClass} flex-1`}>
                  <SelectValue placeholder="Inget objective" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Inget objective</SelectItem>
                  {objectives.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {objectiveId ? (
                <Link
                  href={`/admin/operations/objectives/${objectiveId}`}
                  className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={dt.label}>Project</Label>
            {objectiveId ? (
              <p className={`pb-0.5 ${dt.muted}`}>
                Endast projekt kopplade till valt objective visas.
              </p>
            ) : null}
            <div className="flex items-center gap-1">
              <Select
                value={projectId ?? "__none__"}
                onValueChange={(v) => void handleProjectSelect(v)}
                disabled={saving}
              >
                <SelectTrigger className={`${fieldClass} flex-1`}>
                  <SelectValue placeholder="Inget projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Inget projekt</SelectItem>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projectId ? (
                <Link
                  href={`/admin/operations/projects/${projectId}`}
                  className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={dt.label}>Uppskattade timmar</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              className={fieldClass}
              defaultValue={task.estimated_hours ?? ""}
              onChange={(e) =>
                handleUpdate(
                  "estimated_hours",
                  e.target.value ? parseFloat(e.target.value) : null,
                )
              }
              disabled={saving}
            />
          </div>
        </div>
      )}
    </div>
  )
}
