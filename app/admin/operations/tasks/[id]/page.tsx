import { getTask } from "@/lib/actions/operations"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentAdmin } from "@/lib/admin-auth-server"
import { StrategicBreadcrumb } from "@/components/admin/operations/strategic-breadcrumb"
import { TaskStatusBadge } from "@/components/admin/operations/task-status-badge"
import { TaskPriorityBadge } from "@/components/admin/operations/task-priority-badge"
import { EntityLinkBadge } from "@/components/admin/operations/entity-link-badge"
import { TaskDetailActions } from "@/components/admin/operations/task-detail-actions"
import { TaskDetailTitleEditor } from "@/components/admin/operations/task-detail-title-editor"
import { TaskDetailDescriptionBlock } from "@/components/admin/operations/task-detail-description-block"
import { TaskDetailDelete } from "@/components/admin/operations/task-detail-delete"
import { TaskComments } from "@/components/admin/operations/task-comments"
import { CreatedMetaLine } from "@/components/admin/operations/created-meta-line"
import { DetailBreadcrumbTitle } from "@/components/admin/detail-breadcrumb-title"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params

  const [task, sb, admin] = await Promise.all([
    getTask(id).catch(() => null),
    Promise.resolve(getSupabaseAdmin()),
    getCurrentAdmin(),
  ])

  if (!task) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/operations/tasks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          All Tasks
        </Link>
        <StrategicBreadcrumb current="Task" showUnlinkedWarning={false} />
        <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Task hittades inte
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Den här tasken kan vara borttagen eller så gick något fel när vi
            hämtade den.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/admin/operations/tasks"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-gray-100 dark:hover:bg-zinc-900/60"
            >
              Tillbaka till Tasks
            </Link>
            <Link
              href="/admin/operations"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-gray-100 dark:hover:bg-zinc-900/60"
            >
              Till Operations
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
            ID: <span className="font-mono">{id}</span>
          </p>
        </div>
      </div>
    )
  }

  const [projectsRes, objectivesRes, adminsRes] = await Promise.all([
    sb
      .from("admin_projects")
      .select("id, name, objective_id")
      .is("deleted_at", null)
      .order("name"),
    sb
      .from("admin_objectives")
      .select("id, title")
      .is("deleted_at", null)
      .order("title"),
    sb
      .from("profiles")
      .select("id, email")
      .eq("role", "admin")
      .order("email"),
  ])

  const projects = projectsRes.data ?? []
  const objectives = objectivesRes.data ?? []
  const admins = adminsRes.data ?? []

  return (
    <div className="space-y-6">
      <DetailBreadcrumbTitle title={task.title} />
      <Link
        href="/admin/operations/tasks"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        All Tasks
      </Link>

      {/* Strategisk tråd */}
      <StrategicBreadcrumb
        goal={
          task.objective?.goal
            ? {
                id: task.objective.goal.id,
                title: task.objective.goal.title,
              }
            : null
        }
        objective={task.objective ?? null}
        project={
          task.project
            ? { id: task.project.id, name: task.project.name }
            : null
        }
        current={task.title}
        currentLevel="task"
      />

      {/* Header */}
      <div className="min-w-0 space-y-2">
        <TaskDetailTitleEditor taskId={task.id} initialTitle={task.title} />
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
        </div>
        <CreatedMetaLine
          createdAt={task.created_at}
          creatorEmail={task.creator?.email}
          showUnknownIfNoCreator
        />
      </div>

      {/* Body — details first on small screens for quicker edits */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="order-1 space-y-4 lg:order-2 lg:col-span-1">
          <TaskDetailActions
            task={task}
            projects={projects}
            objectives={objectives}
            admins={admins}
          />
        </div>

        <div className="order-2 min-w-0 space-y-6 lg:order-1 lg:col-span-2">
          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 bg-white dark:bg-[#0F0F12]">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Subtasks ({task.subtasks.length})
              </h2>
              <div className="space-y-2">
                {task.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex flex-col gap-1 text-sm py-1 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 break-words text-gray-700 dark:text-gray-300">
                      {sub.title}
                    </span>
                    <TaskStatusBadge status={sub.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entity links */}
          {task.entity_links.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 bg-white dark:bg-[#0F0F12]">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Linked to
              </h2>
              <div className="flex flex-wrap gap-2">
                {task.entity_links.map((link) => (
                  <EntityLinkBadge key={link.id} link={link} />
                ))}
              </div>
            </div>
          )}

          <TaskDetailDescriptionBlock
            taskId={task.id}
            initialDescription={task.description}
          />

          {/* Comments */}
          <TaskComments
            task_id={task.id}
            comments={task.comments}
            current_admin_id={admin?.id ?? ""}
          />

          <TaskDetailDelete
            taskId={task.id}
            projectId={task.project?.id ?? task.project_id}
          />
        </div>
      </div>
    </div>
  )
}
