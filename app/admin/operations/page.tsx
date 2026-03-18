import { getOperationsDashboard } from "@/lib/actions/operations"
import { getCurrentAdmin } from "@/lib/admin-auth-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { TaskStatusBadge } from "@/components/admin/operations/task-status-badge"
import { TaskPriorityBadge } from "@/components/admin/operations/task-priority-badge"
import { CreateTaskButton } from "@/components/admin/operations/create-task-button"
import Link from "next/link"
import {
  ListTodo,
  AlertTriangle,
  Eye,
  FolderKanban,
  Target,
  ArrowRight,
} from "lucide-react"
import type { Task } from "@/lib/types/operations"

export default async function OperationsDashboardPage() {
  const [dashboard, admin, sb] = await Promise.all([
    getOperationsDashboard(),
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

  const statCards = [
    {
      label: "Open Tasks",
      value: dashboard.stats.open_tasks,
      icon: ListTodo,
      iconColor: "text-blue-500",
      href: "/admin/operations/tasks",
    },
    {
      label: "Overdue",
      value: dashboard.stats.overdue_tasks,
      icon: AlertTriangle,
      iconColor:
        dashboard.stats.overdue_tasks > 0 ? "text-red-500" : "text-gray-400",
      valueColor:
        dashboard.stats.overdue_tasks > 0
          ? "text-red-600 dark:text-red-400"
          : "text-gray-900 dark:text-white",
      href: "/admin/operations/tasks",
    },
    {
      label: "In Review",
      value: dashboard.stats.review_tasks,
      icon: Eye,
      iconColor: "text-amber-500",
      href: "/admin/operations/tasks",
    },
    {
      label: "Active Projects",
      value: dashboard.stats.active_projects,
      icon: FolderKanban,
      iconColor: "text-purple-500",
      href: "/admin/operations/projects",
    },
    {
      label: "Active Objectives",
      value: dashboard.stats.active_objectives,
      icon: Target,
      iconColor: "text-emerald-500",
      href: "/admin/operations/okrs",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Operations
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {admin?.email?.split("@")[0]}
          </p>
        </div>
        <CreateTaskButton
          projects={projects}
          objectives={objectives}
          admins={admins}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {card.label}
                </p>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <p
                className={`text-2xl font-semibold ${
                  card.valueColor ?? "text-gray-900 dark:text-gray-100"
                }`}
              >
                {card.value}
              </p>
            </Link>
          )
        })}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My tasks this week */}
        <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-zinc-900/70">
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                My Tasks This Week
              </span>
            </div>
            <Link
              href="/admin/operations/my-work"
              className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {dashboard.my_tasks_this_week.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 px-4 py-8 text-center">
              Nothing due this week
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {dashboard.my_tasks_this_week.map((task: Task) => (
                <Link
                  key={task.id}
                  href={`/admin/operations/tasks/${task.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {task.title}
                    </p>
                    {task.project && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                        {task.project.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TaskPriorityBadge priority={task.priority} />
                    {task.due_date && (
                      <span
                        className={`text-xs ${
                          isOverdue(task)
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {task.due_date}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Blocked tasks */}
        <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-zinc-900/70">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Blocked Tasks
              </span>
              {dashboard.blocked_tasks.length > 0 && (
                <span className="text-xs text-red-500 font-medium">
                  {dashboard.blocked_tasks.length}
                </span>
              )}
            </div>
            <Link
              href="/admin/operations/tasks?status=blocked"
              className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {dashboard.blocked_tasks.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 px-4 py-8 text-center">
              No blocked tasks
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {dashboard.blocked_tasks.map((task: Task) => (
                <Link
                  key={task.id}
                  href={`/admin/operations/tasks/${task.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {task.title}
                    </p>
                    {task.project && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                        {task.project.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TaskStatusBadge status={task.status} />
                    {task.assignee && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {task.assignee.email.split("@")[0]}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "View all tasks",
            description: "Table and board view",
            href: "/admin/operations/tasks",
            icon: ListTodo,
          },
          {
            label: "View projects",
            description: "Track initiative progress",
            href: "/admin/operations/projects",
            icon: FolderKanban,
          },
          {
            label: "View objectives",
            description: "Strategic goals and KRs",
            href: "/admin/operations/okrs",
            icon: Target,
          },
        ].map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {link.label}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {link.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
