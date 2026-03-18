export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "review"
  | "done"
  | "cancelled"

export type TaskPriority = "low" | "medium" | "high" | "urgent"

export type TaskType =
  | "feature"
  | "bug"
  | "data"
  | "content"
  | "ops"
  | "admin"

export type ProjectStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "archived"

export type ProjectPriority = "low" | "medium" | "high" | "critical"

export type ObjectiveStatus =
  | "draft"
  | "active"
  | "completed"
  | "archived"

export type ObjectiveProgressMethod =
  | "manual"
  | "key_results"
  | "tasks"

export type KeyResultType = "numeric" | "milestone" | "binary"

export type DependencyType = "blocks" | "relates_to" | "duplicates"

export type EntityType =
  | "producer"
  | "wine"
  | "wine_box"
  | "booking"
  | "reservation"
  | "pallet"
  | "zone"
  | "menu_document"
  | "extraction_job"
  | "user"
  | "business"

export type StrategyArea =
  | "Growth"
  | "Quality"
  | "Operations"
  | "Product"

// ─── Minimala join-typer ─────────────────────────────────────

export interface AdminUserMin {
  id: string
  email: string
}

export interface TaskMin {
  id: string
  title: string
  status: TaskStatus
}

export interface ProjectMin {
  id: string
  name: string
}

export interface ObjectiveMin {
  id: string
  title: string
}

export interface KeyResultMin {
  id: string
  title: string
}

// ─── Key Result ──────────────────────────────────────────────

export interface KeyResult {
  id: string
  objective_id: string
  title: string
  description: string | null
  type: KeyResultType
  start_value: number
  target_value: number
  current_value: number
  status: string
  due_date: string | null
  owner_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // Computed
  progress?: number
  // Joins
  owner?: AdminUserMin
}

// ─── Objective ───────────────────────────────────────────────

export interface Objective {
  id: string
  title: string
  description: string | null
  period: string
  owner_id: string | null
  status: ObjectiveStatus
  strategy_area: StrategyArea | null
  progress_method: ObjectiveProgressMethod
  manual_progress: number | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Computed
  progress?: number
  project_count?: number
  open_task_count?: number
  // Joins
  key_results?: KeyResult[]
  owner?: AdminUserMin
}

// ─── Project ─────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  description: string | null
  objective_id: string | null
  key_result_id: string | null
  owner_id: string | null
  status: ProjectStatus
  priority: ProjectPriority
  start_date: string | null
  due_date: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Computed
  progress?: number
  task_count?: number
  open_task_count?: number
  // Joins
  objective?: ObjectiveMin
  owner?: AdminUserMin
}

// ─── Task ────────────────────────────────────────────────────

export interface Task {
  id: string
  title: string
  description: string | null
  project_id: string | null
  objective_id: string | null
  parent_task_id: string | null
  assigned_to: string | null
  created_by: string
  status: TaskStatus
  priority: TaskPriority
  task_type: TaskType
  due_date: string | null
  start_date: string | null
  completed_at: string | null
  sort_order: number
  status_sort_order: number
  estimated_hours: number | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Joins
  project?: ProjectMin
  objective?: ObjectiveMin
  assignee?: AdminUserMin
}

// ─── Task detail (detaljsida) ────────────────────────────────

export interface TaskDetail extends Task {
  comments: TaskComment[]
  activity: TaskActivity[]
  entity_links: EntityLink[]
  dependencies: TaskDependency[]
  subtasks: Task[]
  key_result?: KeyResultMin
}

// ─── Task comment ────────────────────────────────────────────

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
  author?: AdminUserMin
}

// ─── Task activity ───────────────────────────────────────────

export interface TaskActivity {
  id: string
  task_id: string
  actor_id: string
  action_type: string
  old_value: string | null
  new_value: string | null
  created_at: string
  actor?: AdminUserMin
}

// ─── Entity link ─────────────────────────────────────────────

export interface EntityLink {
  id: string
  task_id: string
  entity_type: EntityType
  entity_id: string
  label: string | null
  created_at: string
}

// ─── Task dependency ─────────────────────────────────────────

export interface TaskDependency {
  task_id: string
  depends_on_id: string
  type: DependencyType
  depends_on?: TaskMin
}

// ─── Task template ───────────────────────────────────────────

export interface TaskTemplateItem {
  title: string
  description?: string
  priority: TaskPriority
  task_type: TaskType
}

export interface TaskTemplate {
  id: string
  name: string
  description: string | null
  entity_type: EntityType | null
  template_data: TaskTemplateItem[]
  created_by: string | null
  created_at: string
}

// ─── Filter-typer ────────────────────────────────────────────

export interface TaskFilters {
  status?: TaskStatus[]
  assigned_to?: string
  project_id?: string
  objective_id?: string
  priority?: TaskPriority[]
  task_type?: TaskType[]
  due_before?: string
  due_after?: string
  search?: string
  include_deleted?: boolean
}

export interface ProjectFilters {
  status?: ProjectStatus[]
  objective_id?: string
  owner_id?: string
  priority?: ProjectPriority[]
  include_deleted?: boolean
}

export interface ObjectiveFilters {
  status?: ObjectiveStatus[]
  period?: string
  strategy_area?: StrategyArea
  owner_id?: string
  include_deleted?: boolean
}

// ─── Create/Update-typer ─────────────────────────────────────

export interface CreateTaskData {
  title: string
  description?: string
  project_id?: string | null
  objective_id?: string | null
  parent_task_id?: string | null
  assigned_to?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  task_type?: TaskType
  due_date?: string | null
  start_date?: string | null
  estimated_hours?: number | null
}

export type UpdateTaskData = Partial<CreateTaskData> & {
  status?: TaskStatus
  sort_order?: number
  status_sort_order?: number
}

export interface CreateProjectData {
  name: string
  description?: string
  objective_id?: string | null
  key_result_id?: string | null
  owner_id?: string | null
  status?: ProjectStatus
  priority?: ProjectPriority
  start_date?: string | null
  due_date?: string | null
}

export type UpdateProjectData = Partial<CreateProjectData>

export interface CreateObjectiveData {
  title: string
  description?: string
  period: string
  owner_id?: string | null
  status?: ObjectiveStatus
  strategy_area?: StrategyArea | null
  progress_method?: ObjectiveProgressMethod
  manual_progress?: number | null
}

export type UpdateObjectiveData = Partial<CreateObjectiveData>

export interface CreateKeyResultData {
  objective_id: string
  title: string
  description?: string
  type?: KeyResultType
  start_value?: number
  target_value?: number
  current_value?: number
  due_date?: string | null
  owner_id?: string | null
  sort_order?: number
}

export type UpdateKeyResultData = Partial<
  Omit<CreateKeyResultData, "objective_id">
>
