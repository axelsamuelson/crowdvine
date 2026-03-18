import { getMyWork } from "@/lib/actions/operations"
import { getCurrentAdmin } from "@/lib/admin-auth-server"
import { TaskStatusBadge } from "@/components/admin/operations/task-status-badge"
import { TaskPriorityBadge } from "@/components/admin/operations/task-priority-badge"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { CreateTaskButton } from "@/components/admin/operations/create-task-button"
import Link from "next/link"
import { AlertTriangle, Clock, Eye, ListTodo } from "lucide-react"
import type { Task } from "@/lib/types/operations"

export default async function MyWorkPage() {
  const [work, admin, sb] = await Promise.all([
    getMyWork(),
    getCurrentAdmin(),
    Promise.resolve(getSupabaseAdmin()),
  ])

  const [projectsRes, objectivesRes, adminsRes] = await Promise.all([
    sb
      .from("admin_projects")
      .select("id, name")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name"),
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

  const projects = projectsRes.data ?? []
  const objectives = objectivesRes.data ?? []
  const admins = adminsRes.data ?? []

  const today = new Date().toISOString().split("T")[0]

  function isOverdue(task: Task): boolean {
    return (
      !!task.due_date &&
      task.due_date < today &&
      task.status !== "done" &&
      task.status !== "cancelled"
    )
  }

  const sections = [
    {
      id: "overdue",
      label: "Overdue",
      icon: AlertTriangle,
      iconColor: "text-red-500",
      tasks: work.overdue,
      emptyText: "No overdue tasks",
    },
    {
      id: "due_this_week",
      label: "Due This Week",
      icon: Clock,
      iconColor: "text-amber-500",
      tasks: work.due_this_week,
      emptyText: "Nothing due this week",
    },
    {
      id: "in_review",
      label: "In Review",
      icon: Eye,
      iconColor: "text-blue-500",
      tasks: work.in_review,
      emptyText: "No tasks in review",
    },
    {
      id: "all",
      label: "All Assigned to Me",
      icon: ListTodo,
      iconColor: "text-gray-500",
      tasks: work.all_assigned,
      emptyText: "No tasks assigned to you",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            My Work
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {admin?.email}
          </p>
        </div>
        <CreateTaskButton
          projects={projects}
          objectives={objectives}
          admins={admins}
        />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Overdue",
            value: work.overdue.length,
            color:
              work.overdue.length > 0
                ? "text-red-600 dark:text-red-400"
                : "text-gray-900 dark:text-white",
          },
          {
            label: "Due This Week",
            value: work.due_this_week.length,
            color: "text-gray-900 dark:text-white",
          },
          {
            label: "In Review",
            value: work.in_review.length,
            color: "text-gray-900 dark:text-white",
          },
          {
            label: "Total Open",
            value: work.all_assigned.length,
            color: "text-gray-900 dark:text-white",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4"
          >
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {stat.label}
            </p>
            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Task sections */}
      {sections.map((section) => {
        const Icon = section.icon
        return (
          <div
            key={section.id}
            className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-zinc-900/70">
              <Icon className={`h-4 w-4 ${section.iconColor}`} />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {section.label}
              </span>
              <span className="ml-auto text-xs text-gray-600 dark:text-gray-400">
                {section.tasks.length}
              </span>
            </div>

            {/* Task rows */}
            {section.tasks.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 px-4 py-6 text-center">
                {section.emptyText}
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
                {section.tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/admin/operations/tasks/${task.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    {/* Title + unlinked signal */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {task.title}
                      </p>
                      {(task.project || task.objective) && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                          {[task.project?.name, task.objective?.title]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge status={task.status} />
                    </div>

                    {/* Due date */}
                    {task.due_date && (
                      <span
                        className={`text-xs flex-shrink-0 ${
                          isOverdue(task)
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {task.due_date}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
