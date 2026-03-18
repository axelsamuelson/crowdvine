import { notFound } from "next/navigation"
import { getTask } from "@/lib/actions/operations"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentAdmin } from "@/lib/admin-auth-server"
import { StrategicBreadcrumb } from "@/components/admin/operations/strategic-breadcrumb"
import { TaskStatusBadge } from "@/components/admin/operations/task-status-badge"
import { TaskPriorityBadge } from "@/components/admin/operations/task-priority-badge"
import { EntityLinkBadge } from "@/components/admin/operations/entity-link-badge"
import { TaskDetailActions } from "@/components/admin/operations/task-detail-actions"
import { TaskComments } from "@/components/admin/operations/task-comments"

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

  if (!task) notFound()

  const [projectsRes, objectivesRes, adminsRes] = await Promise.all([
    sb
      .from("admin_projects")
      .select("id, name")
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
      {/* Strategisk tråd */}
      <StrategicBreadcrumb
        objective={task.objective ?? null}
        project={
          task.project
            ? { id: task.project.id, name: task.project.name }
            : null
        }
        current={task.title}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {task.title}
          </h1>
          <div className="flex items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vänster: 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {task.description && (
            <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 bg-white dark:bg-[#0F0F12]">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

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
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
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

          {/* Comments */}
          <TaskComments
            task_id={task.id}
            comments={task.comments}
            current_admin_id={admin?.id ?? ""}
          />
        </div>

        {/* Höger: 1/3 */}
        <div className="space-y-4">
          <TaskDetailActions
            task={task}
            projects={projects}
            objectives={objectives}
            admins={admins}
          />
        </div>
      </div>
    </div>
  )
}
