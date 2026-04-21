import { notFound } from "next/navigation"
import { getProject } from "@/lib/actions/operations"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { StrategicHierarchyChain } from "@/components/admin/operations/strategic-hierarchy-chain"
import { TaskTable } from "@/components/admin/operations/task-table"
import { CreateTaskButton } from "@/components/admin/operations/create-task-button"
import { CreatedMetaLine } from "@/components/admin/operations/created-meta-line"
import { ProjectDeleteWithTasksControl } from "@/components/admin/operations/project-delete-with-tasks-control"
import { DetailBreadcrumbTitle } from "@/components/admin/detail-breadcrumb-title"
import { ProjectDetailTitleEditor } from "@/components/admin/operations/project-detail-title-editor"
import { ProjectDetailDescriptionBlock } from "@/components/admin/operations/project-detail-description-block"
import { ProjectDetailActions } from "@/components/admin/operations/project-detail-actions"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { KeyResultPickerOption, Task } from "@/lib/types/operations"

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
      .select("id, email, full_name")
      .eq("role", "admin")
      .order("email"),
  ])

  const objectives = objectivesRes.data ?? []
  const admins = adminsRes.data ?? []
  const objectiveIds = objectives.map((o) => o.id)
  let keyResultOptions: KeyResultPickerOption[] = []
  if (objectiveIds.length > 0) {
    const { data } = await sb
      .from("admin_key_results")
      .select("id, title, objective_id")
      .in("objective_id", objectiveIds)
      .order("sort_order")
    keyResultOptions = (data ?? []) as KeyResultPickerOption[]
  }

  const tasks = (project.tasks ?? []) as Task[]

  const statuses = [
    { label: "Total", value: tasks.length },
    {
      label: "Open",
      value: tasks.filter(
        (t) => !["done", "cancelled", "paused"].includes(t.status),
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

  const backHref = project.objective_id
    ? `/admin/operations/objectives/${project.objective_id}`
    : "/admin/operations/projects"
  const backLabel = project.objective_id ? "Målsättning" : "Alla projekt"
  const backAria = project.objective?.title
    ? `Till målsättning: ${project.objective.title}`
    : project.objective_id
      ? "Till målsättning"
      : "Till alla projekt"

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-10">
      <DetailBreadcrumbTitle title={project.name} />

      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          aria-label={backAria}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {backLabel}
        </Link>
      </div>

      <section className="overflow-clip rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:shadow-none">
        <div className="px-5 pt-4 sm:px-6 sm:pt-5">
          <CreatedMetaLine
            taskDetailPrimaryLabels
            createdAt={project.created_at}
            creatorEmail={project.creator?.email}
            showUnknownIfNoCreator={Boolean(project.created_by)}
          />
        </div>

        <div className="border-b border-zinc-100 px-5 pb-5 pt-3 sm:px-6 dark:border-zinc-800">
          <ProjectDetailTitleEditor
            projectId={project.id}
            initialName={project.name}
          />
        </div>

        <ProjectDetailDescriptionBlock
          projectId={project.id}
          initialDescription={project.description}
          variant="embedded"
          heading="Beskrivning"
          emptyText="Ingen beskrivning"
        />

        <div className="grid gap-5 p-5 sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-stretch">
          <ProjectDetailActions
            project={project}
            objectives={objectives}
            admins={admins}
            keyResultOptions={keyResultOptions}
          />

          <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-gray-100 bg-gray-50/90 p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900/45">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
              Strategisk kedja
            </p>
            <StrategicHierarchyChain
              embedded
              goal={
                project.objective?.goal
                  ? {
                      id: project.objective.goal.id,
                      title: project.objective.goal.title,
                    }
                  : null
              }
              objective={
                project.objective_id && project.objective
                  ? {
                      id: project.objective_id,
                      title: project.objective.title,
                    }
                  : null
              }
              current={project.name}
              currentLevel="project"
              showUnlinkedWarning={false}
            />
          </div>
        </div>
      </section>

      <section
        aria-label="Tasks per status"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
      >
        {statuses.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center justify-center rounded-xl border border-gray-200/90 bg-white px-3 py-5 text-center shadow-sm dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:shadow-none sm:py-6"
          >
            <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white sm:text-3xl">
              {s.value}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-400">
              {s.label}
            </p>
          </div>
        ))}
      </section>

      <section aria-label="Tasks" className="min-w-0 space-y-4">
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
          wrapTaskTitles
          objectiveDisplayOverride={
            project.objective_id && project.objective
              ? {
                  id: project.objective_id,
                  title: project.objective.title,
                }
              : null
          }
        />
      </section>

      <footer className="border-t border-dashed border-gray-200 pt-8 dark:border-zinc-800">
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
      </footer>
    </div>
  )
}
