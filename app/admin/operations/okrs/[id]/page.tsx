import { notFound } from "next/navigation"
import { getObjective } from "@/lib/actions/operations"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { ObjectiveStatusBadge } from "@/components/admin/operations/objective-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import { KeyResultRow } from "@/components/admin/operations/key-result-row"
import { TaskTable } from "@/components/admin/operations/task-table"
import { CreateTaskButton } from "@/components/admin/operations/create-task-button"
import { CreateProjectButton } from "@/components/admin/operations/create-project-button"
import { ProjectStatusBadge } from "@/components/admin/operations/project-status-badge"
import { AddKeyResultButton } from "@/components/admin/operations/add-key-result-button"
import { CreateObjectiveButton } from "@/components/admin/operations/create-objective-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import type { Task, KeyResult, ProjectStatus } from "@/lib/types/operations"

const STRATEGY_COLORS: Record<string, string> = {
  Growth:
    "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/50",
  Quality:
    "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950/50",
  Operations:
    "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-950/50",
  Product:
    "border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:bg-purple-950/50",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ObjectiveDetailPage({ params }: PageProps) {
  const { id } = await params

  const objective = await getObjective(id).catch(() => null)
  if (!objective) notFound()

  const sb = getSupabaseAdmin()

  const [objectivesRes, adminsRes] = await Promise.all([
    sb
      .from("admin_objectives")
      .select("id, title")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("title"),
    sb
      .from("profiles")
      .select("id, email")
      .eq("role", "admin")
      .order("email"),
  ])

  const objectives = objectivesRes.data ?? []
  const admins = adminsRes.data ?? []
  const tasks = (objective.tasks ?? []) as Task[]
  const projects = objective.projects ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
              {objective.period}
            </span>
            {objective.strategy_area && (
              <span
                className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${STRATEGY_COLORS[objective.strategy_area] ?? "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300"}`}
              >
                {objective.strategy_area}
              </span>
            )}
            <ObjectiveStatusBadge status={objective.status} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {objective.title}
          </h1>
          {objective.owner && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Owner: {objective.owner.email}
            </p>
          )}
        </div>
        <CreateObjectiveButton
          admins={admins}
          objective={objective}
          label="Edit Objective"
        />
      </div>

      {/* Progress card */}
      <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Overall Progress
          </span>
          <span className="text-2xl font-semibold text-gray-900 dark:text-white">
            {objective.progress ?? 0}%
          </span>
        </div>
        <ProgressBar value={objective.progress ?? 0} showLabel={false} />

        {objective.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
            {objective.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="key_results">
        <TabsList className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-1">
          <TabsTrigger
            value="key_results"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            Key Results ({objective.key_results?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger
            value="projects"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            Tasks ({tasks.length})
          </TabsTrigger>
        </TabsList>

        {/* Key Results */}
        <TabsContent value="key_results" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <AddKeyResultButton objective_id={objective.id} />
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] px-4">
            {(!objective.key_results || objective.key_results.length === 0) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No key results yet
              </p>
            )}
            {(objective.key_results ?? []).map((kr: KeyResult) => (
              <KeyResultRow key={kr.id} kr={kr} />
            ))}
          </div>
        </TabsContent>

        {/* Projects */}
        <TabsContent value="projects" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <CreateProjectButton
              objectives={objectives}
              admins={admins}
              defaultObjectiveId={objective.id}
              label="Add Project"
            />
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            {projects.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No projects linked
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
                {projects.map((project: { id: string; name: string; status: ProjectStatus; due_date?: string | null }) => (
                  <Link
                    key={project.id}
                    href={`/admin/operations/projects/${project.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {project.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <ProjectStatusBadge status={project.status} />
                      {project.due_date && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {project.due_date}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <CreateTaskButton
              projects={projects.map((p: { id: string; name: string }) => ({
                id: p.id,
                name: p.name,
              }))}
              objectives={objectives}
              admins={admins}
              defaultObjectiveId={objective.id}
              label="Add Task"
            />
          </div>
          <TaskTable
            tasks={tasks}
            projects={projects.map((p: { id: string; name: string }) => ({
              id: p.id,
              name: p.name,
            }))}
            objectives={objectives}
            admins={admins}
            showObjective={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
