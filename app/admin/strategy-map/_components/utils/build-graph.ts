import type { Edge, Node } from "@xyflow/react"
import type { Goal, Objective, Project, Task } from "@/lib/types/operations"
import { applyDagreLayout, getOrphanNodeIds } from "./layout"
import { makeNodeId } from "./validate-connection"

export type RelationKind =
  | "goal-objective"
  | "objective-project"
  | "objective-task"
  | "project-task"

export interface StrategyMapEntities {
  goals: Goal[]
  objectives: Objective[]
  projects: Project[]
  tasks: Task[]
}

function edgeColorForSource(sourceId: string): string {
  if (sourceId.startsWith("objective:")) return "var(--sm-edge-objective, #6366f1)"
  if (sourceId.startsWith("project:")) return "var(--sm-edge-project, #d97706)"
  return "var(--sm-edge-task, #059669)"
}

export function buildGraph(entities: StrategyMapEntities): {
  nodes: Node[]
  edges: Edge[]
} {
  const { goals, objectives, projects, tasks } = entities

  const edges: Edge[] = []

  for (const o of objectives) {
    if (o.goal_id) {
      const source = makeNodeId("goal", o.goal_id)
      const target = makeNodeId("objective", o.id)
      edges.push({
        id: `e:${source}->${target}`,
        source,
        target,
        type: "relation",
        data: {
          label: "mål",
          relation: "goal-objective" as RelationKind,
        },
        animated: true,
        style: { stroke: edgeColorForSource(source), strokeWidth: 2 },
      })
    }
  }

  for (const p of projects) {
    if (p.objective_id) {
      const source = makeNodeId("objective", p.objective_id)
      const target = makeNodeId("project", p.id)
      edges.push({
        id: `e:${source}->${target}`,
        source,
        target,
        type: "relation",
        data: {
          label: "driver",
          relation: "objective-project" as RelationKind,
        },
        animated: true,
        style: { stroke: edgeColorForSource(source), strokeWidth: 2 },
      })
    }
  }

  for (const t of tasks) {
    if (t.project_id) {
      const source = makeNodeId("project", t.project_id)
      const target = makeNodeId("task", t.id)
      edges.push({
        id: `e:${source}->${target}`,
        source,
        target,
        type: "relation",
        data: {
          label: "ingår i",
          relation: "project-task" as RelationKind,
        },
        animated: true,
        style: { stroke: edgeColorForSource(source), strokeWidth: 2 },
      })
    } else if (t.objective_id) {
      const source = makeNodeId("objective", t.objective_id)
      const target = makeNodeId("task", t.id)
      edges.push({
        id: `e:${source}->${target}`,
        source,
        target,
        type: "relation",
        data: {
          label: "driver",
          relation: "objective-task" as RelationKind,
        },
        animated: true,
        style: { stroke: edgeColorForSource(source), strokeWidth: 2 },
      })
    }
  }

  const orphanIds = getOrphanNodeIds(
    [
      ...goals.map((g) => ({
        id: makeNodeId("goal", g.id),
        position: { x: 0, y: 0 },
        data: {},
      })),
      ...objectives.map((o) => ({
        id: makeNodeId("objective", o.id),
        position: { x: 0, y: 0 },
        data: {},
      })),
      ...projects.map((p) => ({
        id: makeNodeId("project", p.id),
        position: { x: 0, y: 0 },
        data: {},
      })),
      ...tasks.map((t) => ({
        id: makeNodeId("task", t.id),
        position: { x: 0, y: 0 },
        data: {},
      })),
    ],
    edges
  )

  const nodes: Node[] = [
    ...goals.map((g) => ({
      id: makeNodeId("goal", g.id),
      type: "goal",
      position: { x: 0, y: 0 },
      data: {
        record: g,
        isOrphan: orphanIds.has(makeNodeId("goal", g.id)),
      },
    })),
    ...objectives.map((o) => ({
      id: makeNodeId("objective", o.id),
      type: "objective",
      position: { x: 0, y: 0 },
      data: {
        record: o,
        isOrphan: orphanIds.has(makeNodeId("objective", o.id)),
      },
    })),
    ...projects.map((p) => ({
      id: makeNodeId("project", p.id),
      type: "project",
      position: { x: 0, y: 0 },
      data: {
        record: p,
        taskCount: tasks.filter((t) => t.project_id === p.id).length,
        isOrphan: orphanIds.has(makeNodeId("project", p.id)),
      },
    })),
    ...tasks.map((t) => ({
      id: makeNodeId("task", t.id),
      type: "task",
      position: { x: 0, y: 0 },
      data: {
        record: t,
        isOrphan: orphanIds.has(makeNodeId("task", t.id)),
      },
    })),
  ]

  const laidOut = applyDagreLayout(nodes, edges)

  return { nodes: laidOut, edges }
}

/** Keep node positions when rebuilding graph (e.g. after filter or data change). */
export function mergeNodePositions(
  previous: Node[],
  fresh: Node[]
): Node[] {
  const posMap = new Map(previous.map((n) => [n.id, n.position]))
  return fresh.map((n) => ({
    ...n,
    position: posMap.get(n.id) ?? n.position,
  }))
}
