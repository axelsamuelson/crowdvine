import { notFound } from "next/navigation"
import { getProject } from "@/lib/actions/operations"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { ProjectStatusBadge } from "@/components/admin/operations/project-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import { StrategicBreadcrumb } from "@/components/admin/operations/strategic-breadcrumb"
import { TaskTable } from "@/components/admin/operations/task-table"
import { CreateTaskButton } from "@/components/admin/operations/create-task-button"
import { CreateProjectButton } from "@/components/admin/operations/create-project-button"
import { CreatedMetaLine } from "@/components/admin/operations/created-meta-line"
import { ProjectDeleteWithTasksControl } from "@/components/admin/operations/project-delete-with-tasks-control"
import { DetailBreadcrumbTitle } from "@/components/admin/detail-breadcrumb-title"
import { ProjectDetailTitleEditor } from "@/components/admin/operations/project-detail-title-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { Task } from "@/lib/types/operations"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params

  const project = await getProject(id).catch(() => null)
  if (!project) notFound()

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
  const objectiveIds = objectives.map((o) => o.id)
  let keyResultOptions: { id: string; title: string; objective_id: string }[] = []
  if (objectiveIds.length > 0) {
    const { data } = await sb
      .from("admin_key_results")
      .select("id, title, objective_id")
      .in("objective_id", objectiveIds)
      .order("sort_order")
    keyResultOptions = data ?? []
  }

  const tasks = (project.tasks ?? []) as Task[]

  const statuses = [
    {
      label: "Total",
      value: tasks.length,
    },
    {
      label: "Open",
      value: tasks.filter(
        (t) => !["done", "cancelled"].includes(t.status)
      ).length,
    },
    {
      label: "In Progress",
      value: tasks.filter((t) => t.status === "in_progress").length,
    },
    {
      label: "Done",
      value: tasks.filter((t) => t.status === "done").length,
    },
  ]

  return (
    <div className="space-y-6">
      <DetailBreadcrumbTitle title={project.name} />
      {/* Strategisk tråd */}
      {project.objective && (
        <StrategicBreadcrumb
          goal={
            project.objective.goal
              ? {
                  id: project.objective.goal.id,
                  title: project.objective.goal.title,
                }
              : null
          }
          objective={{
            id: project.objective_id!,
            title: project.objective.title,
          }}
          current={project.name}
          currentLevel="project"
          showUnlinkedWarning={false}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <ProjectDetailTitleEditor
            projectId={project.id}
            initialName={project.name}
          />
          <div className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {project.priority} priority
            </span>
            {project.owner && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                · {project.owner.email.split("@")[0]}
              </span>
            )}
          </div>
          <CreatedMetaLine
            createdAt={project.created_at}
            creatorEmail={project.creator?.email}
            showUnknownIfNoCreator={Boolean(project.created_by)}
          />
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-start">
          <div className="w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
            <CreateProjectButton
              objectives={objectives}
              admins={admins}
              project={project}
              keyResultOptions={keyResultOptions}
              label="Edit Project"
            />
          </div>
          <ProjectDeleteWithTasksControl
            variant="button"
            className="w-full sm:w-auto"
            projectId={project.id}
            projectName={project.name}
            taskCount={tasks.length}
            afterDelete={{
              mode: "redirect",
              href: project.objective_id
                ? `/admin/operations/objectives/${project.objective_id}`
                : "/admin/operations/projects",
            }}
          />
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {project.progress ?? 0}%
          </span>
        </div>
        <ProgressBar value={project.progress ?? 0} showLabel={false} />

        {/* Stat row */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-[#1F1F23] sm:grid-cols-4 sm:gap-4">
          {statuses.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {s.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Objective link */}
      {project.objective && (
        <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <span className="shrink-0">Linked to objective:</span>
          <Link
            href={`/admin/operations/objectives/${project.objective_id}`}
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            {project.objective.title}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList className="h-auto min-h-10 w-full min-w-0 flex-wrap justify-start gap-1 bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-1 sm:inline-flex sm:flex-nowrap">
          <TabsTrigger
            value="tasks"
            className="rounded-lg px-3 py-2 text-xs font-medium shrink-0 text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-gray-200/90 dark:data-[state=active]:bg-zinc-700 dark:data-[state=active]:text-white dark:data-[state=active]:ring-zinc-500/40"
          >
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="rounded-lg px-3 py-2 text-xs font-medium shrink-0 text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-gray-200/90 dark:data-[state=active]:bg-zinc-700 dark:data-[state=active]:text-white dark:data-[state=active]:ring-zinc-500/40"
          >
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4 mt-4 min-w-0">
          <div className="flex justify-stretch sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
            <CreateTaskButton
              projects={[{ id: project.id, name: project.name }]}
              objectives={objectives}
              admins={admins}
              defaultProjectId={project.id}
              label="Add Task"
            />
          </div>
          <TaskTable
            tasks={tasks}
            projects={[{ id: project.id, name: project.name }]}
            objectives={objectives}
            admins={admins}
            showProject={false}
            objectiveDisplayOverride={
              project.objective_id && project.objective
                ? {
                    id: project.objective_id,
                    title: project.objective.title,
                  }
                : null
            }
          />
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4 space-y-4">
            {project.description && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {project.start_date && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Start Date
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {project.start_date}
                  </p>
                </div>
              )}
              {project.due_date && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Due Date
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {project.due_date}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Created
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
