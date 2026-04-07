import dagre from "@dagrejs/dagre"
import type { Edge, Node } from "@xyflow/react"
import type { GraphEntityKind } from "./validate-connection"

const NODE_DIMS: Record<GraphEntityKind, { width: number; height: number }> = {
  goal: { width: 340, height: 168 },
  objective: { width: 300, height: 132 },
  project: { width: 280, height: 118 },
  task: { width: 260, height: 96 },
}

function kindFromNodeId(nodeId: string): GraphEntityKind {
  if (nodeId.startsWith("goal:")) return "goal"
  if (nodeId.startsWith("objective:")) return "objective"
  if (nodeId.startsWith("project:")) return "project"
  if (nodeId.startsWith("task:")) return "task"
  return "task"
}

/** Nodes that have no incident edges in `edges`. */
export function getOrphanNodeIds(
  nodes: Node[],
  edges: Edge[]
): Set<string> {
  const touched = new Set<string>()
  for (const e of edges) {
    touched.add(e.source)
    touched.add(e.target)
  }
  const orphans = new Set<string>()
  for (const n of nodes) {
    if (!touched.has(n.id)) orphans.add(n.id)
  }
  return orphans
}

/**
 * Dagre LR layout: goal → objectives → projects → tasks (vänster till höger).
 * Syskon i samma nivå staplas vertikalt (nodesep). Orphan-noder i kolumn längst till höger.
 */
export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return []

  const orphans = getOrphanNodeIds(nodes, edges)
  const activeNodes = nodes.filter((n) => !orphans.has(n.id))
  const orphanList = nodes.filter((n) => orphans.has(n.id))

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: "LR",
    /* Vertikal separation mellan syskon i samma kolumn (t.ex. flera objectives) */
    nodesep: 14,
    /* Horisontellt mellan nivåer: goal | objectives | projects | tasks */
    ranksep: 28,
    marginx: 16,
    marginy: 16,
    edgesep: 12,
  })

  for (const node of activeNodes) {
    const kind = kindFromNodeId(node.id)
    const { width, height } = NODE_DIMS[kind]
    g.setNode(node.id, { width, height })
  }

  for (const edge of edges) {
    if (orphans.has(edge.source) || orphans.has(edge.target)) continue
    if (!g.hasNode(edge.source) || !g.hasNode(edge.target)) continue
    g.setEdge(edge.source, edge.target)
  }

  if (activeNodes.length > 0) {
    dagre.layout(g)
  }

  const laidOut: Node[] = []

  let maxX = 0
  let maxY = 0

  for (const node of activeNodes) {
    const dim = NODE_DIMS[kindFromNodeId(node.id)]
    const withPos = g.node(node.id)
    const w = withPos?.width ?? dim.width
    const h = withPos?.height ?? dim.height
    const x = (withPos?.x ?? 0) - w / 2
    const y = (withPos?.y ?? 0) - h / 2
    laidOut.push({
      ...node,
      position: { x, y },
    })
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  }

  const orphanStartX = maxX + 48
  const orphanColW = NODE_DIMS.objective.width
  const orphanRowGap = 28
  orphanList.forEach((node, i) => {
    const dim = NODE_DIMS[kindFromNodeId(node.id)]
    laidOut.push({
      ...node,
      position: {
        x: orphanStartX + (orphanColW - dim.width) / 2,
        y: i * (dim.height + orphanRowGap),
      },
    })
  })

  return laidOut
}
