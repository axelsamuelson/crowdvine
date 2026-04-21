export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "review"
  | "paused"
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
  | "paused"
  | "completed"
  | "archived"

export type ProjectPriority = "low" | "medium" | "high" | "critical"

export type ObjectiveStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived"

export type ObjectiveProgressMethod =
  | "manual"
  | "key_results"
  | "tasks"
  | "insights"

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
  full_name?: string | null
}

export interface TaskMin {
  id: string
  title: string
  status: TaskStatus
}

export interface ProjectMin {
  id: string
  name: string
  /** För filtrering på task-sidan m.m. */
  objective_id?: string | null
}

export interface ObjectiveMin {
  id: string
  title: string
  goal_id?: string | null
  goal?: GoalMin | null
}

export type GoalStatus =
  | "active"
  | "completed"
  | "paused"
  | "cancelled"

export interface GoalMin {
  id: string
  title: string
}

export interface KeyResultMin {
  id: string
  title: string
}

/** Options for linking a project to a key result (grouped by objective in the form). */
export interface KeyResultPickerOption {
  id: string
  title: string
  objective_id: string
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

// ─── Goal (strategisk nivå ovanför objectives) ────────────────

export interface Goal {
  id: string
  title: string
  description: string | null
  status: GoalStatus
  deleted_at: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  // Computed (list / detail)
  progress?: number
  objective_count?: number
  objectives?: Objective[]
  creator?: AdminUserMin
}

// ─── Objective insights (progress_method = insights) ────────

export interface ObjectiveInsight {
  id: string
  objective_id: string
  body: string
  created_at: string
  created_by?: string | null
}

// ─── Objective ───────────────────────────────────────────────

export interface Objective {
  id: string
  title: string
  description: string | null
  period: string
  goal_id: string | null
  owner_id: string | null
  status: ObjectiveStatus
  strategy_area: StrategyArea | null
  progress_method: ObjectiveProgressMethod
  manual_progress: number | null
  /** When progress_method = insights: target count of unique insights for 100%. */
  insights_target?: number | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  // Computed
  progress?: number
  project_count?: number
  open_task_count?: number
  /** Average KR progress (objective detail). */
  kr_progress_aggregate?: number | null
  /** Average task-based progress across projects under this objective (detail). */
  project_delivery_progress?: number | null
  /** Detail: rows for progress_method insights. */
  insights?: ObjectiveInsight[]
  // Joins
  key_results?: KeyResult[]
  goal?: GoalMin | null
  owner?: AdminUserMin
  creator?: AdminUserMin
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
  created_by?: string | null
  // Computed
  progress?: number
  task_count?: number
  open_task_count?: number
  // Joins
  objective?: ObjectiveMin
  owner?: AdminUserMin
  creator?: AdminUserMin
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
  /** All people assigned (junction); `assignee` / `assigned_to` reflect primary. */
  assignees?: AdminUserMin[]
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
  creator?: AdminUserMin
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
  /** When true, include rows with parent_task_id (subtasks). Default: only root tasks. */
  include_child_tasks?: boolean
}

export interface ProjectFilters {
  status?: ProjectStatus[]
  objective_id?: string
  owner_id?: string
  priority?: ProjectPriority[]
  include_deleted?: boolean
}

export interface GoalFilters {
  status?: GoalStatus[]
  include_deleted?: boolean
}

export interface ObjectiveFilters {
  status?: ObjectiveStatus[]
  period?: string
  strategy_area?: StrategyArea
  owner_id?: string
  goal_id?: string
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
  goal_id?: string | null
  owner_id?: string | null
  status?: ObjectiveStatus
  strategy_area?: StrategyArea | null
  progress_method?: ObjectiveProgressMethod
  manual_progress?: number | null
  insights_target?: number | null
}

export type UpdateObjectiveData = Partial<CreateObjectiveData>

export interface CreateGoalData {
  title: string
  description?: string
  status?: GoalStatus
}

export type UpdateGoalData = Partial<CreateGoalData> & {
  status?: GoalStatus
}

// ─── Objective metrics (live DB-backed) ─────────────────────

export type MetricQueryType =
  | "count"
  | "ratio"
  | "average"
  | "sum"
  | "custom"

export type MetricPeriodType =
  | "all_time"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "current_month"
  | "custom"

export interface ObjectiveMetricRow {
  id: string
  objective_id: string
  slug: string
  label: string
  unit: string
  query_type: MetricQueryType
  query_config: Record<string, unknown>
  target_value: number | null
  current_value: number
  refreshed_at: string
  period_type: MetricPeriodType
  period_start: string | null
  period_end: string | null
  created_at: string
}

export interface MetricResult {
  slug: string
  label: string
  unit: string
  current_value: number
  target_value: number | null
  progress: number
  refreshed_at: string
}

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
