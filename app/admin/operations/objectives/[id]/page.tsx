import { notFound } from "next/navigation"
import { getGoals, getObjective } from "@/lib/actions/operations"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { ObjectiveStatusBadge } from "@/components/admin/operations/objective-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import { TaskTable } from "@/components/admin/operations/task-table"
import { CreateTaskButton } from "@/components/admin/operations/create-task-button"
import { CreateObjectiveButton } from "@/components/admin/operations/create-objective-button"
import { CreatedMetaLine } from "@/components/admin/operations/created-meta-line"
import { ObjectiveOutcomeDeliveryHint } from "@/components/admin/operations/objective-outcome-delivery-hint"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Task } from "@/lib/types/operations"
import { ObjectiveProjectsPanel } from "@/components/admin/operations/objective-projects-panel"
import { DetailBreadcrumbTitle } from "@/components/admin/detail-breadcrumb-title"
import { ObjectiveDetailDelete } from "@/components/admin/operations/objective-detail-delete"

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

const OBJECTIVE_TAB_TRIGGER_CLASS =
  "shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 shadow-none ring-offset-0 transition-colors hover:text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:text-zinc-400 dark:hover:text-zinc-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function ObjectiveDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const { tab: tabParam } = await searchParams
  const defaultTab = tabParam === "tasks" ? "tasks" : "projects"

  const objective = await getObjective(id).catch(() => null)
  if (!objective) notFound()

  const sb = getSupabaseAdmin()

  const [objectivesRes, adminsRes, goals] = await Promise.all([
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
    getGoals({}),
  ])

  const objectives = objectivesRes.data ?? []
  const admins = adminsRes.data ?? []
  const goalOptions = goals.map((g) => ({ id: g.id, title: g.title }))
  const objectiveIdsForKrs = objectives.map((o) => o.id)
  let keyResultOptions: { id: string; title: string; objective_id: string }[] =
    []
  if (objectiveIdsForKrs.length > 0) {
    const { data } = await sb
      .from("admin_key_results")
      .select("id, title, objective_id")
      .in("objective_id", objectiveIdsForKrs)
      .order("sort_order")
    keyResultOptions = data ?? []
  }
  const tasks = (objective.tasks ?? []) as Task[]
  const projects = objective.projects ?? []
  const unassignedTaskCount = tasks.filter(
    (t) => t.project_id == null || t.project_id === ""
  ).length

  return (
    <div className="space-y-6">
      <DetailBreadcrumbTitle title={objective.title} />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl break-words">
            {objective.title}
          </h1>
          {objective.owner && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Owner: {objective.owner.email}
            </p>
          )}
          <CreatedMetaLine
            createdAt={objective.created_at}
            creatorEmail={objective.creator?.email}
            showUnknownIfNoCreator={Boolean(objective.created_by)}
          />
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-start">
          <div className="w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
            <CreateObjectiveButton
              admins={admins}
              goals={goalOptions}
              objective={objective}
              label="Edit Objective"
            />
          </div>
          <ObjectiveDetailDelete
            objectiveId={objective.id}
            objectiveTitle={objective.title}
            goalId={objective.goal_id}
          />
        </div>
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

        <ObjectiveOutcomeDeliveryHint
          krAggregate={objective.kr_progress_aggregate ?? null}
          projectDelivery={objective.project_delivery_progress ?? null}
        />

        {objective.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
            {objective.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} key={defaultTab}>
        <TabsList className="h-auto min-h-10 w-full min-w-0 flex-wrap justify-start gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-zinc-700 dark:bg-zinc-900 sm:inline-flex sm:w-auto sm:flex-nowrap">
          <TabsTrigger value="projects" className={OBJECTIVE_TAB_TRIGGER_CLASS}>
            Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className={OBJECTIVE_TAB_TRIGGER_CLASS}>
            Tasks ({tasks.length})
          </TabsTrigger>
        </TabsList>

        {/* Projects */}
        <TabsContent value="projects" className="mt-4 space-y-4 min-w-0">
          <ObjectiveProjectsPanel
            objectiveId={objective.id}
            projects={projects.map((project) => ({
              id: project.id,
              name: project.name,
              status: project.status,
              due_date: project.due_date,
            }))}
            projectTaskCounts={objective.projectTaskCounts ?? {}}
            unassignedTaskCount={unassignedTaskCount}
            objectives={objectives}
            admins={admins}
            keyResultOptions={keyResultOptions}
          />
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="mt-4 space-y-4 min-w-0">
          <div className="flex justify-stretch sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
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
