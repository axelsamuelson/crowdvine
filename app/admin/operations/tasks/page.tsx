import { Suspense } from "react"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getTasks } from "@/lib/actions/operations"
import { TasksViewContainer } from "@/components/admin/operations/tasks-view-container"
import { TaskFilters } from "@/components/admin/operations/task-filters"
import { CreateTaskButton } from "@/components/admin/operations/create-task-button"
import { ListTodo } from "lucide-react"
import type {
  TaskFilters as TFilters,
  TaskStatus,
  TaskPriority,
} from "@/lib/types/operations"

interface PageProps {
  searchParams: Promise<{
    status?: string
    priority?: string
    assigned_to?: string
    project_id?: string
    objective_id?: string
    search?: string
  }>
}

export default async function TasksPage({ searchParams }: PageProps) {
  const params = await searchParams
  const sb = getSupabaseAdmin()

  const filters: TFilters = {}
  if (params.status) filters.status = [params.status as TaskStatus]
  if (params.priority) filters.priority = [params.priority as TaskPriority]
  if (params.assigned_to) filters.assigned_to = params.assigned_to
  if (params.project_id) filters.project_id = params.project_id
  if (params.objective_id) filters.objective_id = params.objective_id
  if (params.search) filters.search = params.search

  const [tasks, projectsRes, objectivesRes, adminsRes] = await Promise.all([
    getTasks(filters),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <ListTodo className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tasks
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <CreateTaskButton
          projects={projects}
          objectives={objectives}
          admins={admins}
        />
      </div>

      <Suspense fallback={null}>
        <TaskFilters
          projects={projects}
          objectives={objectives}
          admins={admins}
        />
      </Suspense>

      <TasksViewContainer
        tasks={tasks}
        projects={projects}
        objectives={objectives}
        admins={admins}
      />
    </div>
  )
}
