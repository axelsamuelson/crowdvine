import { getProjects } from "@/lib/actions/operations"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { ProjectStatusBadge } from "@/components/admin/operations/project-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import { CreateProjectButton } from "@/components/admin/operations/create-project-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { FolderKanban } from "lucide-react"
import type {
  ProjectStatus,
  ProjectPriority,
  ProjectFilters,
} from "@/lib/types/operations"

interface PageProps {
  searchParams: Promise<{
    status?: string
    objective_id?: string
    owner_id?: string
  }>
}

const PRIORITY_ORDER: Record<ProjectPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const sb = getSupabaseAdmin()

  const filters: ProjectFilters = {}
  if (params.status) filters.status = [params.status as ProjectStatus]
  if (params.objective_id) filters.objective_id = params.objective_id
  if (params.owner_id) filters.owner_id = params.owner_id

  const [projects, objectivesRes, adminsRes] = await Promise.all([
    getProjects(filters),
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

  const sorted = [...projects].sort(
    (a, b) =>
      PRIORITY_ORDER[a.priority as ProjectPriority] -
      PRIORITY_ORDER[b.priority as ProjectPriority]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <FolderKanban className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Projects
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <CreateProjectButton objectives={objectives} admins={admins} />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-zinc-900/70 border-b border-gray-200 dark:border-zinc-800">
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Name</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Objective</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Owner</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Status</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Priority</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Due Date</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Progress</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Open Tasks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-10 text-sm text-gray-500 dark:text-zinc-400"
                >
                  No projects found
                </TableCell>
              </TableRow>
            )}
            {sorted.map((project) => (
              <TableRow
                key={project.id}
                className="cursor-pointer border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
              >
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/operations/projects/${project.id}`}
                    className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-200 hover:underline"
                  >
                    {project.name}
                  </Link>
                </TableCell>

                <TableCell className="text-sm text-gray-700 dark:text-gray-300 max-w-[180px]">
                  {project.objective ? (
                    <Link
                      href={`/admin/operations/okrs/${project.objective_id}`}
                      className="hover:underline truncate block"
                    >
                      {project.objective.title}
                    </Link>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">—</span>
                  )}
                </TableCell>

                <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                  {project.owner?.email ? (
                    project.owner.email.split("@")[0]
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">—</span>
                  )}
                </TableCell>

                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>

                <TableCell className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {project.priority}
                </TableCell>

                <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                  {project.due_date ?? (
                    <span className="text-gray-500 dark:text-gray-400">—</span>
                  )}
                </TableCell>

                <TableCell className="min-w-[120px]">
                  <ProgressBar value={project.progress ?? 0} size="sm" />
                </TableCell>

                <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                  {project.open_task_count ?? 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
