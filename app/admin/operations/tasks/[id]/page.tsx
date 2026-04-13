import { getTask } from "@/lib/actions/operations"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentAdmin } from "@/lib/admin-auth-server"
import { StrategicHierarchyChain } from "@/components/admin/operations/strategic-hierarchy-chain"
import { EntityLinkBadge } from "@/components/admin/operations/entity-link-badge"
import { TaskDetailActions } from "@/components/admin/operations/task-detail-actions"
import { TaskDetailTitleEditor } from "@/components/admin/operations/task-detail-title-editor"
import { TaskDetailDescriptionBlock } from "@/components/admin/operations/task-detail-description-block"
import { TaskDetailDelete } from "@/components/admin/operations/task-detail-delete"
import { TaskComments } from "@/components/admin/operations/task-comments"
import { TaskSubtasksChecklist } from "@/components/admin/operations/task-subtasks-checklist"
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
      .select("id, email, full_name")
      .eq("role", "admin")
      .order("email"),
  ])

  const projects = projectsRes.data ?? []
  const objectives = objectivesRes.data ?? []
  const admins = adminsRes.data ?? []

  const projectId = task.project?.id ?? task.project_id
  const backHref = projectId
    ? `/admin/operations/projects/${projectId}`
    : "/admin/operations/tasks"
  const backLabel = projectId ? "Project" : "Alla tasks"
  const backAria =
    projectId && task.project?.name
      ? `Till projekt: ${task.project.name}`
      : projectId
        ? "Till projekt"
        : "Till alla tasks"

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <DetailBreadcrumbTitle title={task.title} />

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

      {/* Överblick: skapad → titel → beskrivning → Detaljer + kedja */}
      <section className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:shadow-none">
        <div className="px-5 pt-4 sm:px-6 sm:pt-5">
          <CreatedMetaLine
            taskDetailPrimaryLabels
            createdAt={task.created_at}
            creatorEmail={task.creator?.email}
            showUnknownIfNoCreator
            dueDate={task.due_date}
            completedAt={task.completed_at}
          />
        </div>

        <div className="border-b border-zinc-100 px-5 pb-5 pt-3 sm:px-6 dark:border-zinc-800">
          <TaskDetailTitleEditor taskId={task.id} initialTitle={task.title} />
        </div>

        <TaskDetailDescriptionBlock
          taskId={task.id}
          initialDescription={task.description}
          variant="embedded"
          heading="Beskrivning"
          emptyText="Ingen beskrivning"
        />

        <div className="grid gap-5 p-5 sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-stretch">
          <TaskDetailActions
            task={task}
            projects={projects}
            objectives={objectives}
            admins={admins}
          />

          <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-gray-100 bg-gray-50/90 p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900/45">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
              Strategisk kedja
            </p>
            <StrategicHierarchyChain
              embedded
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
          </div>
        </div>
      </section>

      <section
        aria-label="Innehåll"
        className="min-w-0 space-y-6"
      >
        {!task.parent_task_id ? (
          <TaskSubtasksChecklist
            key={`${task.id}-${task.updated_at}`}
            parentTaskId={task.id}
            initialSubtasks={task.subtasks}
          />
        ) : null}

        {task.entity_links.length > 0 && (
          <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-5 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:shadow-none">
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
              Kopplad till
            </h2>
            <div className="flex flex-wrap gap-2">
              {task.entity_links.map((link) => (
                <EntityLinkBadge key={link.id} link={link} />
              ))}
            </div>
          </div>
        )}

        <TaskComments
          task_id={task.id}
          comments={task.comments}
          current_admin_id={admin?.id ?? ""}
        />
      </section>

      <footer className="border-t border-dashed border-gray-200 pt-8 dark:border-zinc-800">
        <TaskDetailDelete
          taskId={task.id}
          projectId={task.project?.id ?? task.project_id}
        />
      </footer>
    </div>
  )
}
