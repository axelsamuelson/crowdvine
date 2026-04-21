"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateProject } from "@/lib/actions/operations"
import type {
  AdminUserMin,
  KeyResultPickerOption,
  ObjectiveMin,
  Project,
} from "@/lib/types/operations"
import Link from "next/link"
import { ExternalLink, Pencil } from "lucide-react"
import { CreateProjectButton } from "./create-project-button"
import { ProjectDetailQuickFields } from "./project-detail-quick-fields"
import { taskDetailPrimaryLabelClass } from "@/components/admin/operations/task-detail-primary-label"
import { adminDisplayName } from "@/lib/operations/display-admin-name"

const dt = {
  eyebrow:
    "text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500",
  title:
    "text-xs font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100",
  body: "text-xs leading-relaxed text-zinc-700 dark:text-zinc-300",
  muted: "text-xs leading-relaxed text-zinc-500 dark:text-zinc-500",
} as const

interface Props {
  project: Project
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
  keyResultOptions: KeyResultPickerOption[]
}

export function ProjectDetailActions({
  project,
  objectives,
  admins,
  keyResultOptions,
}: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ownerId, setOwnerId] = useState<string | null>(project.owner_id ?? null)

  useEffect(() => {
    setOwnerId(project.owner_id ?? null)
  }, [project.owner_id, project.id])

  async function patchOwner(next: string | null) {
    setSaving(true)
    try {
      await updateProject(project.id, { owner_id: next })
      setOwnerId(next)
      toast.success("Sparat")
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
            <ProjectDetailQuickFields
              projectId={project.id}
              status={project.status}
              priority={project.priority}
            />
          </div>

          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div className={`space-y-2 ${dt.body}`}>
              <p>
                {project.owner ? (
                  <>
                    <span className={taskDetailPrimaryLabelClass}>Ägare: </span>
                    <span className="break-words" title={project.owner.email}>
                      {adminDisplayName(project.owner)}
                    </span>
                  </>
                ) : (
                  <span className={dt.muted}>Ingen ägare</span>
                )}
              </p>
              {(project.start_date || project.due_date) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {project.start_date ? (
                    <p>
                      <span className={dt.muted}>Start: </span>
                      {project.start_date}
                    </p>
                  ) : null}
                  {project.due_date ? (
                    <p>
                      <span className={dt.muted}>Deadline: </span>
                      {project.due_date}
                    </p>
                  ) : null}
                </div>
              )}
              {project.objective_id && project.objective ? (
                <p className={dt.muted}>
                  <Link
                    href={`/admin/operations/objectives/${project.objective_id}`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {project.objective.title}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </Link>
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
            <ProjectDetailQuickFields
              projectId={project.id}
              status={project.status}
              priority={project.priority}
            />
          </div>

          <div className="space-y-2">
            <Label className={taskDetailPrimaryLabelClass}>Ägare</Label>
            <Select
              value={ownerId ?? "__none__"}
              disabled={saving}
              onValueChange={(v) => {
                const next = v === "__none__" ? null : v
                void patchOwner(next)
              }}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Ingen ägare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ingen ägare</SelectItem>
                {admins.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(project.start_date || project.due_date) && (
            <div className={`grid grid-cols-2 gap-2 ${dt.body}`}>
              {project.start_date ? (
                <div>
                  <span className={dt.muted}>Start: </span>
                  {project.start_date}
                </div>
              ) : null}
              {project.due_date ? (
                <div>
                  <span className={dt.muted}>Deadline: </span>
                  {project.due_date}
                </div>
              ) : null}
            </div>
          )}

          <p className={dt.muted}>
            Namn, datum, mål/KR och övrigt ändras i projektformuläret.
          </p>

          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <CreateProjectButton
              objectives={objectives}
              admins={admins}
              project={project}
              keyResultOptions={keyResultOptions}
              label="Redigera projekt"
            />
          </div>
        </div>
      )}
    </div>
  )
}
