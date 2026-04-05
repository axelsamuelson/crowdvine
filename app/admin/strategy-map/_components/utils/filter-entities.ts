import type { Goal, Objective, Project, Task } from "@/lib/types/operations"
import type { MapToolbarState, StatusScope } from "../toolbar/map-toolbar"
import { buildGraph } from "./build-graph"
import { getOrphanNodeIds } from "./layout"
import { makeNodeId } from "./validate-connection"

export type StrategyEntities = {
  objectives: Objective[]
  projects: Project[]
  tasks: Task[]
}

function filterStatus(
  entities: StrategyEntities,
  scope: StatusScope
): StrategyEntities {
  if (scope === "all") return entities
  if (scope === "active") {
    return {
      objectives: entities.objectives.filter((o) => o.status === "active"),
      projects: entities.projects.filter(
        (p) => p.status !== "completed" && p.status !== "archived"
      ),
      tasks: entities.tasks.filter(
        (t) => t.status !== "done" && t.status !== "cancelled"
      ),
    }
  }
  return {
    objectives: entities.objectives.filter((o) => o.status === "completed"),
    projects: entities.projects.filter((p) => p.status === "completed"),
    tasks: entities.tasks.filter((t) => t.status === "done"),
  }
}

export function filterEntitiesForToolbar(
  raw: StrategyEntities,
  toolbar: MapToolbarState
): StrategyEntities {
  let { goals, objectives, projects, tasks } = filterStatus(
    raw,
    toolbar.statusScope
  )

  if (!toolbar.showGoals) goals = []
  if (!toolbar.showObjectives) objectives = []
  if (!toolbar.showProjects) projects = []
  if (!toolbar.showTasks) tasks = []

  if (toolbar.unconnectedOnly) {
    const { nodes, edges } = buildGraph({ goals, objectives, projects, tasks })
    const orphanIds = getOrphanNodeIds(nodes, edges)
    goals = goals.filter((g) => orphanIds.has(makeNodeId("goal", g.id)))
    objectives = objectives.filter((o) =>
      orphanIds.has(makeNodeId("objective", o.id))
    )
    projects = projects.filter((p) =>
      orphanIds.has(makeNodeId("project", p.id))
    )
    tasks = tasks.filter((t) => orphanIds.has(makeNodeId("task", t.id)))
  }

  return { goals, objectives, projects, tasks }
}

export function nodeTitle(node: {
  type?: string
  data: { record: Goal | Objective | Project | Task }
}): string {
  const r = node.data.record
  if ("name" in r && r.name) return r.name
  if ("title" in r) return r.title
  return ""
}
