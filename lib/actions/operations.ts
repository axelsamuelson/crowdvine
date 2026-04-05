"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentAdmin } from "@/lib/admin-auth-server"
import type {
  Task,
  TaskDetail,
  TaskComment,
  TaskActivity,
  EntityLink,
  Project,
  Objective,
  KeyResult,
  Goal,
  TaskFilters,
  ProjectFilters,
  ObjectiveFilters,
  GoalFilters,
  CreateTaskData,
  UpdateTaskData,
  CreateProjectData,
  UpdateProjectData,
  CreateObjectiveData,
  UpdateObjectiveData,
  CreateKeyResultData,
  UpdateKeyResultData,
  CreateGoalData,
  UpdateGoalData,
  TaskStatus,
} from "@/lib/types/operations"

// ─── Helpers ─────────────────────────────────────────────────

async function getActorId(): Promise<string> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error("Unauthorized")
  return admin.id
}

async function logActivity(
  task_id: string,
  actor_id: string,
  action_type: string,
  old_value?: string | null,
  new_value?: string | null
) {
  const sb = getSupabaseAdmin()
  await sb.from("admin_task_activity").insert({
    task_id,
    actor_id,
    action_type,
    old_value: old_value ?? null,
    new_value: new_value ?? null,
  })
}

/** Standard admin_tasks-rad: projekt, objective, assignee, skapare. */
const ADMIN_TASK_SELECT = `*,
  project:admin_projects(id, name),
  objective:admin_objectives(id, title, goal_id, goal:admin_goals(id, title)),
  assignee:profiles!admin_tasks_assigned_to_fkey(id, email),
  creator:profiles!admin_tasks_created_by_fkey(id, email)`

// ─── Progress-beräkning ──────────────────────────────────────

import {
  computeTaskWeight,
  computeProjectProgress,
  computeKeyResultProgress,
  computeObjectiveProgress,
  computeKeyResultsAggregateProgress,
  computeProjectsDeliveryAggregateProgress,
  computeGoalProgress,
} from "@/lib/operations/progress"

// ─── TASKS ───────────────────────────────────────────────────

export async function getTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const sb = getSupabaseAdmin()

  let query = sb
    .from("admin_tasks")
    .select(ADMIN_TASK_SELECT)
    .order("created_at", { ascending: false })

  if (!filters.include_deleted) {
    query = query.is("deleted_at", null)
  }

  if (filters.status?.length) {
    query = query.in("status", filters.status)
  }

  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to)
  }

  if (filters.project_id) {
    query = query.eq("project_id", filters.project_id)
  }

  if (filters.objective_id) {
    query = query.eq("objective_id", filters.objective_id)
  }

  if (filters.priority?.length) {
    query = query.in("priority", filters.priority)
  }

  if (filters.task_type?.length) {
    query = query.in("task_type", filters.task_type)
  }

  if (filters.due_before) {
    query = query.lte("due_date", filters.due_before)
  }

  if (filters.due_after) {
    query = query.gte("due_date", filters.due_after)
  }

  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTask(id: string): Promise<TaskDetail> {
  const sb = getSupabaseAdmin()

  const { data: task, error } = await sb
    .from("admin_tasks")
    .select(
      `
      ${ADMIN_TASK_SELECT},
      comments:admin_task_comments(
        *,
        author:profiles!admin_task_comments_author_id_fkey(id, email)
      ),
      activity:admin_task_activity(
        *,
        actor:profiles!admin_task_activity_actor_id_fkey(id, email)
      ),
      entity_links:admin_entity_links(*),
      subtasks:admin_tasks!parent_task_id(
        ${ADMIN_TASK_SELECT}
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  // Supabase/PostgREST returns an error for `.single()` when no rows are found.
  // Treat "no rows" as not-found so the UI can render a graceful empty state.
  if (error) {
    const code = (error as any)?.code as string | undefined
    const msg = (error as any)?.message as string | undefined
    if (code === "PGRST116" || msg?.toLowerCase().includes("0 rows")) {
      return null as unknown as TaskDetail
    }
    throw new Error(error.message)
  }

  // Hämta dependencies separat
  const { data: deps } = await sb
    .from("admin_task_dependencies")
    .select(
      `
      *,
      depends_on:admin_tasks!admin_task_dependencies_depends_on_id_fkey(
        id, title, status
      )
    `
    )
    .eq("task_id", id)

  return {
    ...task,
    dependencies: deps ?? [],
    comments: task.comments ?? [],
    activity: (task.activity ?? []).sort(
      (a: TaskActivity, b: TaskActivity) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    entity_links: task.entity_links ?? [],
    subtasks: task.subtasks ?? [],
  }
}

export async function createTask(data: CreateTaskData): Promise<Task> {
  const sb = getSupabaseAdmin()
  const actor_id = await getActorId()

  const { data: task, error } = await sb
    .from("admin_tasks")
    .insert({
      ...data,
      created_by: actor_id,
    })
    .select(ADMIN_TASK_SELECT)
    .single()

  if (error) throw new Error(error.message)

  await logActivity(task.id, actor_id, "created")

  revalidatePath("/admin/operations")
  revalidatePath("/admin/operations/tasks")
  revalidatePath("/admin/operations/my-work")
  revalidatePath(`/admin/operations/tasks/${task.id}`)
  revalidatePath("/admin/strategy-map")

  return task
}

export async function updateTask(
  id: string,
  data: UpdateTaskData
): Promise<Task> {
  const sb = getSupabaseAdmin()
  const actor_id = await getActorId()

  // Hämta nuvarande värden för activity log
  const { data: current } = await sb
    .from("admin_tasks")
    .select("status, assigned_to, due_date, priority, project_id, objective_id")
    .eq("id", id)
    .single()

  // Hantera completed_at
  const updates: Record<string, unknown> = { ...data }
  if (data.status === "done" && current?.status !== "done") {
    updates.completed_at = new Date().toISOString()
  } else if (
    data.status &&
    data.status !== "done" &&
    current?.status === "done"
  ) {
    updates.completed_at = null
  }

  const { data: task, error } = await sb
    .from("admin_tasks")
    .update(updates)
    .eq("id", id)
    .select(ADMIN_TASK_SELECT)
    .single()

  if (error) throw new Error(error.message)

  // Logga ändringar
  if (current) {
    if (data.status && data.status !== current.status) {
      await logActivity(id, actor_id, "status_changed", current.status, data.status)
    }
    if ("assigned_to" in data && data.assigned_to !== current.assigned_to) {
      await logActivity(
        id,
        actor_id,
        "assignee_changed",
        current.assigned_to,
        data.assigned_to ?? null
      )
    }
    if ("due_date" in data && data.due_date !== current.due_date) {
      await logActivity(
        id,
        actor_id,
        "due_date_changed",
        current.due_date,
        data.due_date ?? null
      )
    }
    if ("priority" in data && data.priority !== current.priority) {
      await logActivity(
        id,
        actor_id,
        "priority_changed",
        current.priority,
        data.priority
      )
    }
    if ("project_id" in data && data.project_id !== current.project_id) {
      await logActivity(
        id,
        actor_id,
        "linked_to_project",
        current.project_id,
        data.project_id ?? null
      )
    }
    if ("objective_id" in data && data.objective_id !== current.objective_id) {
      await logActivity(
        id,
        actor_id,
        "linked_to_objective",
        current.objective_id,
        data.objective_id ?? null
      )
    }
  }

  revalidatePath("/admin/operations")
  revalidatePath("/admin/operations/tasks")
  revalidatePath(`/admin/operations/tasks/${id}`)
  revalidatePath("/admin/operations/my-work")
  revalidatePath("/admin/strategy-map")

  return task
}

export async function deleteTask(id: string): Promise<void> {
  const sb = getSupabaseAdmin()

  const { error } = await sb
    .from("admin_tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/operations/tasks")
  revalidatePath(`/admin/operations/tasks/${id}`)
  revalidatePath("/admin/operations")
  revalidatePath("/admin/strategy-map")
  revalidatePath("/admin/operations/my-work")
}

export async function addComment(
  task_id: string,
  body: string
): Promise<TaskComment> {
  const sb = getSupabaseAdmin()
  const actor_id = await getActorId()

  const { data, error } = await sb
    .from("admin_task_comments")
    .insert({ task_id, author_id: actor_id, body })
    .select(
      `
      *,
      author:profiles!admin_task_comments_author_id_fkey(id, email)
    `
    )
    .single()

  if (error) throw new Error(error.message)

  await logActivity(task_id, actor_id, "comment_added")

  revalidatePath(`/admin/operations/tasks/${task_id}`)

  return data
}

export async function linkEntity(
  task_id: string,
  entity_type: string,
  entity_id: string,
  label?: string
): Promise<EntityLink> {
  const sb = getSupabaseAdmin()

  const { data, error } = await sb
    .from("admin_entity_links")
    .insert({ task_id, entity_type, entity_id, label: label ?? null })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/admin/operations/tasks/${task_id}`)

  return data
}

export async function unlinkEntity(
  link_id: string,
  task_id: string
): Promise<void> {
  const sb = getSupabaseAdmin()

  const { error } = await sb
    .from("admin_entity_links")
    .delete()
    .eq("id", link_id)

  if (error) throw new Error(error.message)

  revalidatePath(`/admin/operations/tasks/${task_id}`)
}

// ─── PROJECTS ────────────────────────────────────────────────

export async function getProjects(
  filters: ProjectFilters = {}
): Promise<Project[]> {
  const sb = getSupabaseAdmin()

  let query = sb
    .from("admin_projects")
    .select(
      `
      *,
      objective:admin_objectives(id, title, goal_id, goal:admin_goals(id, title)),
      owner:profiles!admin_projects_owner_id_fkey(id, email),
      creator:profiles!admin_projects_created_by_fkey(id, email)
    `
    )
    .order("created_at", { ascending: false })

  if (!filters.include_deleted) {
    query = query.is("deleted_at", null)
  }

  if (filters.status?.length) {
    query = query.in("status", filters.status)
  }

  if (filters.objective_id) {
    query = query.eq("objective_id", filters.objective_id)
  }

  if (filters.owner_id) {
    query = query.eq("owner_id", filters.owner_id)
  }

  if (filters.priority?.length) {
    query = query.in("priority", filters.priority)
  }

  const { data: projects, error } = await query
  if (error) throw new Error(error.message)

  // Beräkna progress per project
  const projectIds = (projects ?? []).map((p) => p.id)
  if (projectIds.length === 0) return []

  const { data: tasks } = await sb
    .from("admin_tasks")
    .select("id, project_id, status")
    .in("project_id", projectIds)
    .is("deleted_at", null)

  return (projects ?? []).map((project) => {
    const projectTasks = (tasks ?? []).filter(
      (t) => t.project_id === project.id
    )
    const openTasks = projectTasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled"
    )
    return {
      ...project,
      progress: computeProjectProgress(projectTasks as Task[]),
      task_count: projectTasks.length,
      open_task_count: openTasks.length,
    }
  })
}

export async function getProject(id: string) {
  const sb = getSupabaseAdmin()

  const { data: project, error } = await sb
    .from("admin_projects")
    .select(
      `
      *,
      objective:admin_objectives(id, title, goal_id, goal:admin_goals(id, title)),
      owner:profiles!admin_projects_owner_id_fkey(id, email),
      creator:profiles!admin_projects_created_by_fkey(id, email)
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (error) throw new Error(error.message)

  const { data: tasks } = await sb
    .from("admin_tasks")
    .select(ADMIN_TASK_SELECT)
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  const openTasks = (tasks ?? []).filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  )

  return {
    ...project,
    tasks: tasks ?? [],
    progress: computeProjectProgress((tasks ?? []) as Task[]),
    task_count: tasks?.length ?? 0,
    open_task_count: openTasks.length,
  }
}

export async function createProject(
  data: CreateProjectData
): Promise<Project> {
  const sb = getSupabaseAdmin()
  const actor_id = await getActorId()

  const { data: project, error } = await sb
    .from("admin_projects")
    .insert({ ...data, created_by: actor_id })
    .select(
      `
      *,
      objective:admin_objectives(id, title, goal_id, goal:admin_goals(id, title)),
      owner:profiles!admin_projects_owner_id_fkey(id, email),
      creator:profiles!admin_projects_created_by_fkey(id, email)
    `
    )
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/admin/operations")
  revalidatePath("/admin/operations/projects")
  revalidatePath("/admin/strategy-map")
  if (data.objective_id) {
    revalidatePath(`/admin/operations/okrs/${data.objective_id}`)
  }

  return project
}

export async function updateProject(
  id: string,
  data: UpdateProjectData
): Promise<Project> {
  const sb = getSupabaseAdmin()

  const { data: project, error } = await sb
    .from("admin_projects")
    .update(data)
    .eq("id", id)
    .select(
      `
      *,
      objective:admin_objectives(id, title),
      owner:profiles!admin_projects_owner_id_fkey(id, email),
      creator:profiles!admin_projects_created_by_fkey(id, email)
    `
    )
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/admin/operations/projects")
  revalidatePath(`/admin/operations/projects/${id}`)
  revalidatePath("/admin/strategy-map")
  if (project.objective_id) {
    revalidatePath(`/admin/operations/okrs/${project.objective_id}`)
  }

  return project
}

export async function deleteProject(id: string): Promise<void> {
  const sb = getSupabaseAdmin()

  const { data: row } = await sb
    .from("admin_projects")
    .select("objective_id")
    .eq("id", id)
    .single()

  const objectiveId = row?.objective_id as string | null | undefined

  const { error } = await sb
    .from("admin_projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/operations/projects")
  revalidatePath(`/admin/operations/projects/${id}`)
  revalidatePath("/admin/operations")
  revalidatePath("/admin/strategy-map")
  if (objectiveId) {
    revalidatePath(`/admin/operations/okrs/${objectiveId}`)
  }
}

// ─── GOALS ───────────────────────────────────────────────────

export async function getGoals(filters: GoalFilters = {}): Promise<Goal[]> {
  const sb = getSupabaseAdmin()

  let query = sb
    .from("admin_goals")
    .select(
      `
      *,
      creator:profiles!admin_goals_created_by_fkey(id, email)
    `
    )
    .order("created_at", { ascending: false })

  if (!filters.include_deleted) {
    query = query.is("deleted_at", null)
  }

  if (filters.status?.length) {
    query = query.in("status", filters.status)
  }

  const { data: goals, error } = await query
  if (error) throw new Error(error.message)
  if (!goals?.length) return []

  return Promise.all(
    goals.map(async (g) => {
      const objectives = await getObjectives({ goal_id: g.id })
      return {
        ...g,
        objective_count: objectives.length,
        progress: computeGoalProgress(objectives),
      } as Goal
    })
  )
}

export async function getGoal(id: string): Promise<Goal | null> {
  const sb = getSupabaseAdmin()

  const { data: goal, error } = await sb
    .from("admin_goals")
    .select(
      `
      *,
      creator:profiles!admin_goals_created_by_fkey(id, email)
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (error) {
    const code = (error as { code?: string })?.code
    if (code === "PGRST116") return null
    throw new Error(error.message)
  }

  const objectives = await getObjectives({ goal_id: id })
  return {
    ...goal,
    objectives,
    objective_count: objectives.length,
    progress: computeGoalProgress(objectives),
  }
}

export async function createGoal(data: CreateGoalData): Promise<Goal> {
  const sb = getSupabaseAdmin()
  const actor_id = await getActorId()

  const { data: goal, error } = await sb
    .from("admin_goals")
    .insert({
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "active",
      created_by: actor_id,
    })
    .select(
      `
      *,
      creator:profiles!admin_goals_created_by_fkey(id, email)
    `
    )
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/admin/operations/goals")
  revalidatePath("/admin/strategy-map")

  return {
    ...goal,
    objective_count: 0,
    progress: 0,
  }
}

export async function updateGoal(id: string, data: UpdateGoalData): Promise<Goal> {
  const sb = getSupabaseAdmin()

  const { data: goal, error } = await sb
    .from("admin_goals")
    .update(data)
    .eq("id", id)
    .select(
      `
      *,
      creator:profiles!admin_goals_created_by_fkey(id, email)
    `
    )
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/admin/operations/goals")
  revalidatePath(`/admin/operations/goals/${id}`)
  revalidatePath("/admin/strategy-map")

  const objectives = await getObjectives({ goal_id: id })
  return {
    ...goal,
    objectives,
    objective_count: objectives.length,
    progress: computeGoalProgress(objectives),
  }
}

export async function deleteGoal(id: string): Promise<void> {
  const sb = getSupabaseAdmin()

  await sb.from("admin_objectives").update({ goal_id: null }).eq("goal_id", id)

  const { error } = await sb
    .from("admin_goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/operations/goals")
  revalidatePath(`/admin/operations/goals/${id}`)
  revalidatePath("/admin/operations/okrs")
  revalidatePath("/admin/strategy-map")
}

// ─── OBJECTIVES ──────────────────────────────────────────────

export async function getObjectives(
  filters: ObjectiveFilters = {}
): Promise<Objective[]> {
  const sb = getSupabaseAdmin()

  let query = sb
    .from("admin_objectives")
    .select(
      `
      *,
      key_results:admin_key_results(*),
      goal:admin_goals(id, title),
      owner:profiles!admin_objectives_owner_id_fkey(id, email),
      creator:profiles!admin_objectives_created_by_fkey(id, email)
    `
    )
    .order("created_at", { ascending: false })

  if (!filters.include_deleted) {
    query = query.is("deleted_at", null)
  }

  if (filters.status?.length) {
    query = query.in("status", filters.status)
  }

  if (filters.period) {
    query = query.eq("period", filters.period)
  }

  if (filters.strategy_area) {
    query = query.eq("strategy_area", filters.strategy_area)
  }

  if (filters.owner_id) {
    query = query.eq("owner_id", filters.owner_id)
  }

  if (filters.goal_id) {
    query = query.eq("goal_id", filters.goal_id)
  }

  const { data: objectives, error } = await query
  if (error) throw new Error(error.message)

  // Hämta project- och task-antal per objective
  const objectiveIds = (objectives ?? []).map((o) => o.id)
  if (objectiveIds.length === 0) return []

  const { data: projects } = await sb
    .from("admin_projects")
    .select("id, objective_id")
    .in("objective_id", objectiveIds)
    .is("deleted_at", null)

  const { data: tasks } = await sb
    .from("admin_tasks")
    .select("id, objective_id, status")
    .in("objective_id", objectiveIds)
    .is("deleted_at", null)

  return (objectives ?? []).map((obj) => {
    const krs: KeyResult[] = obj.key_results ?? []
    const objTasks = (tasks ?? []).filter((t) => t.objective_id === obj.id)
    const openTasks = objTasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled"
    )
    return {
      ...obj,
      key_results: krs,
      progress: computeObjectiveProgress(obj, krs, objTasks as Task[]),
      project_count: (projects ?? []).filter(
        (p) => p.objective_id === obj.id
      ).length,
      open_task_count: openTasks.length,
    }
  })
}

export async function getObjective(id: string) {
  const sb = getSupabaseAdmin()

  const { data: objective, error } = await sb
    .from("admin_objectives")
    .select(
      `
      *,
      key_results:admin_key_results(*),
      goal:admin_goals(id, title),
      owner:profiles!admin_objectives_owner_id_fkey(id, email),
      creator:profiles!admin_objectives_created_by_fkey(id, email)
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (error) throw new Error(error.message)

  const { data: projects } = await sb
    .from("admin_projects")
    .select(
      `
      *,
      owner:profiles!admin_projects_owner_id_fkey(id, email),
      creator:profiles!admin_projects_created_by_fkey(id, email)
    `
    )
    .eq("objective_id", id)
    .is("deleted_at", null)

  const { data: tasks } = await sb
    .from("admin_tasks")
    .select(
      `
      ${ADMIN_TASK_SELECT}
    `
    )
    .eq("objective_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  const projectIds = (projects ?? []).map((p) => p.id)
  let projectTasksForDelivery: Pick<Task, "project_id" | "status">[] = []
  if (projectIds.length > 0) {
    const { data: pt } = await sb
      .from("admin_tasks")
      .select("project_id, status")
      .in("project_id", projectIds)
      .is("deleted_at", null)
    projectTasksForDelivery = (pt ?? []) as Pick<Task, "project_id" | "status">[]
  }

  const krs: KeyResult[] = objective.key_results ?? []
  const objectiveTasks = (tasks ?? []) as Task[]

  return {
    ...objective,
    key_results: krs,
    projects: projects ?? [],
    tasks: tasks ?? [],
    progress: computeObjectiveProgress(objective, krs, objectiveTasks),
    kr_progress_aggregate: computeKeyResultsAggregateProgress(krs),
    project_delivery_progress: computeProjectsDeliveryAggregateProgress(
      projectIds,
      projectTasksForDelivery
    ),
  }
}

export async function createObjective(
  data: CreateObjectiveData
): Promise<Objective> {
  const sb = getSupabaseAdmin()
  const actor_id = await getActorId()

  const { data: objective, error } = await sb
    .from("admin_objectives")
    .insert({ ...data, created_by: actor_id })
    .select(
      `
      *,
      key_results:admin_key_results(*),
      goal:admin_goals(id, title),
      owner:profiles!admin_objectives_owner_id_fkey(id, email),
      creator:profiles!admin_objectives_created_by_fkey(id, email)
    `
    )
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/admin/operations")
  revalidatePath("/admin/operations/okrs")
  revalidatePath("/admin/operations/goals")
  revalidatePath("/admin/strategy-map")
  if (data.goal_id) {
    revalidatePath(`/admin/operations/goals/${data.goal_id}`)
  }

  return { ...objective, progress: 0 }
}

export async function updateObjective(
  id: string,
  data: UpdateObjectiveData
): Promise<Objective> {
  const sb = getSupabaseAdmin()

  const { data: prevRow } = await sb
    .from("admin_objectives")
    .select("goal_id")
    .eq("id", id)
    .single()

  const prevGoalId = prevRow?.goal_id as string | null | undefined

  const { data: objective, error } = await sb
    .from("admin_objectives")
    .update(data)
    .eq("id", id)
    .select(
      `
      *,
      key_results:admin_key_results(*),
      goal:admin_goals(id, title),
      owner:profiles!admin_objectives_owner_id_fkey(id, email),
      creator:profiles!admin_objectives_created_by_fkey(id, email)
    `
    )
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/admin/operations/okrs")
  revalidatePath(`/admin/operations/okrs/${id}`)
  revalidatePath("/admin/operations/goals")
  revalidatePath("/admin/strategy-map")
  if (prevGoalId && prevGoalId !== objective.goal_id) {
    revalidatePath(`/admin/operations/goals/${prevGoalId}`)
  }
  if (objective.goal_id) {
    revalidatePath(`/admin/operations/goals/${objective.goal_id}`)
  }

  return objective
}

export async function deleteObjective(id: string): Promise<void> {
  const sb = getSupabaseAdmin()

  const { data: prevRow } = await sb
    .from("admin_objectives")
    .select("goal_id")
    .eq("id", id)
    .single()

  const prevGoalId = prevRow?.goal_id as string | null | undefined

  const { error } = await sb
    .from("admin_objectives")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/operations/okrs")
  revalidatePath("/admin/operations")
  revalidatePath("/admin/strategy-map")
  if (prevGoalId) {
    revalidatePath("/admin/operations/goals")
    revalidatePath(`/admin/operations/goals/${prevGoalId}`)
  }
}

// ─── KEY RESULTS ─────────────────────────────────────────────

export async function createKeyResult(
  data: CreateKeyResultData
): Promise<KeyResult> {
  const sb = getSupabaseAdmin()

  const { data: kr, error } = await sb
    .from("admin_key_results")
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/admin/operations/okrs/${data.objective_id}`)

  return { ...kr, progress: computeKeyResultProgress(kr) }
}

export async function updateKeyResult(
  id: string,
  data: UpdateKeyResultData
): Promise<KeyResult> {
  const sb = getSupabaseAdmin()

  const { data: kr, error } = await sb
    .from("admin_key_results")
    .update(data)
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/admin/operations/okrs/${kr.objective_id}`)
  revalidatePath("/admin/operations/okrs")

  return { ...kr, progress: computeKeyResultProgress(kr) }
}

export async function deleteKeyResult(id: string): Promise<void> {
  const sb = getSupabaseAdmin()

  const { data: kr } = await sb
    .from("admin_key_results")
    .select("objective_id")
    .eq("id", id)
    .single()

  const { error } = await sb
    .from("admin_key_results")
    .delete()
    .eq("id", id)

  if (error) throw new Error(error.message)

  if (kr) revalidatePath(`/admin/operations/okrs/${kr.objective_id}`)
}

// ─── MY WORK ─────────────────────────────────────────────────

export async function getMyWork() {
  const actor_id = await getActorId()
  const today = new Date().toISOString().split("T")[0]
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]

  const sb = getSupabaseAdmin()

  const { data: tasks, error } = await sb
    .from("admin_tasks")
    .select(ADMIN_TASK_SELECT)
    .eq("assigned_to", actor_id)
    .is("deleted_at", null)
    .not("status", "in", '("done","cancelled")')
    .order("due_date", { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)

  const all = tasks ?? []

  return {
    overdue: all.filter((t) => t.due_date && t.due_date < today),
    due_this_week: all.filter(
      (t) => t.due_date && t.due_date >= today && t.due_date <= nextWeek
    ),
    in_review: all.filter((t) => t.status === "review"),
    all_assigned: all,
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────

export async function getOperationsDashboard() {
  const sb = getSupabaseAdmin()
  const actor_id = await getActorId()
  const today = new Date().toISOString().split("T")[0]
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]

  const [
    { count: openTasks },
    { count: overdueTasks },
    { count: reviewTasks },
    { count: activeProjects },
    { count: activeObjectives },
    { data: myTasks },
    { data: blockedTasks },
  ] = await Promise.all([
    sb
      .from("admin_tasks")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .not("status", "in", '("done","cancelled")'),
    sb
      .from("admin_tasks")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .lt("due_date", today)
      .not("status", "in", '("done","cancelled")'),
    sb
      .from("admin_tasks")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "review"),
    sb
      .from("admin_projects")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "active"),
    sb
      .from("admin_objectives")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "active"),
    sb
      .from("admin_tasks")
      .select(ADMIN_TASK_SELECT)
      .eq("assigned_to", actor_id)
      .is("deleted_at", null)
      .not("status", "in", '("done","cancelled")')
      .gte("due_date", today)
      .lte("due_date", nextWeek)
      .order("due_date", { ascending: true }),
    sb
      .from("admin_tasks")
      .select(ADMIN_TASK_SELECT)
      .is("deleted_at", null)
      .eq("status", "blocked")
      .order("updated_at", { ascending: false })
      .limit(10),
  ])

  return {
    stats: {
      open_tasks: openTasks ?? 0,
      overdue_tasks: overdueTasks ?? 0,
      review_tasks: reviewTasks ?? 0,
      active_projects: activeProjects ?? 0,
      active_objectives: activeObjectives ?? 0,
    },
    my_tasks_this_week: myTasks ?? [],
    blocked_tasks: blockedTasks ?? [],
  }
}
