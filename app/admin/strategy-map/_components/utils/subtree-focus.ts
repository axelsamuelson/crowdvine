import type { StrategyMapEntities } from "./build-graph"

export type StrategyMapSubtreeFocus =
  | { kind: "objective"; id: string }
  | { kind: "project"; id: string }

/**
 * Keep only the goal / objective / project / task subtree rooted at the focus node.
 */
export function applySubtreeFocus(
  entities: StrategyMapEntities,
  focus: StrategyMapSubtreeFocus | null
): StrategyMapEntities {
  if (!focus) return entities

  if (focus.kind === "objective") {
    const oid = focus.id
    const obj = entities.objectives.find((o) => o.id === oid)
    if (!obj) return entities
    const goals = obj.goal_id
      ? entities.goals.filter((g) => g.id === obj.goal_id)
      : []
    const objectives = [obj]
    const projects = entities.projects.filter((p) => p.objective_id === oid)
    const pids = new Set(projects.map((p) => p.id))
    const tasks = entities.tasks.filter(
      (t) =>
        t.objective_id === oid ||
        (t.project_id != null && pids.has(t.project_id))
    )
    return { goals, objectives, projects, tasks }
  }

  const pid = focus.id
  const proj = entities.projects.find((p) => p.id === pid)
  if (!proj) return entities
  const oid = proj.objective_id
  const obj = oid ? entities.objectives.find((o) => o.id === oid) : undefined
  const goals =
    obj?.goal_id != null
      ? entities.goals.filter((g) => g.id === obj.goal_id)
      : []
  const objectives = obj ? [obj] : []
  const projects = [proj]
  const tasks = entities.tasks.filter((t) => t.project_id === pid)
  return { goals, objectives, projects, tasks }
}
