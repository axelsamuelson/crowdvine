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

/** Endast mellan tasks under samma projekt/objective (påverkar inte objective↔project). */
const TASK_VERTICAL_GAP = 36

/**
 * After Dagre, re-position tasks that share the same project or objective parent
 * so they form a vertical column (centered under the parent) instead of a row.
 */
function stackTasksVerticallyUnderParents(laidOut: Node[], edges: Edge[]): void {
  const byId = new Map(laidOut.map((n) => [n.id, n]))
  const byParent = new Map<string, string[]>()

  for (const e of edges) {
    if (!e.target.startsWith("task:")) continue
    const src = e.source
    if (!src.startsWith("project:") && !src.startsWith("objective:")) continue
    const list = byParent.get(src) ?? []
    list.push(e.target)
    byParent.set(src, list)
  }

  for (const [parentNodeId, taskIds] of byParent) {
    const unique = [...new Set(taskIds)]
    if (unique.length === 0) continue

    const parent = byId.get(parentNodeId)
    if (!parent) continue

    const pDim = NODE_DIMS[kindFromNodeId(parentNodeId)]
    const parentCenterX = parent.position.x + pDim.width / 2
    const startY = parent.position.y + pDim.height + TASK_VERTICAL_GAP

    const taskNodes = unique
      .map((id) => byId.get(id))
      .filter((n): n is Node => Boolean(n))
      .sort((a, b) => {
        if (a.position.y !== b.position.y) return a.position.y - b.position.y
        return a.position.x - b.position.x
      })

    let y = startY
    for (const t of taskNodes) {
      const tDim = NODE_DIMS[kindFromNodeId(t.id)]
      t.position.x = parentCenterX - tDim.width / 2
      t.position.y = y
      y += tDim.height + TASK_VERTICAL_GAP
    }
  }
}

/**
 * Dagre TB layout for connected subgraph; orphan nodes in a column to the right.
 */
export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return []

  const orphans = getOrphanNodeIds(nodes, edges)
  const activeNodes = nodes.filter((n) => !orphans.has(n.id))
  const orphanList = nodes.filter((n) => orphans.has(n.id))

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: "TB",
    /* Horisontellt: syskon-objectives / syskon-projekt närmare varandra */
    nodesep: 28,
    /* Vertikalt mellan nivåer; lågt värde = objective och project närmare varandra */
    ranksep: 18,
    marginx: 28,
    marginy: 28,
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

  /** Dagre places sibling tasks side-by-side; stack them vertically under each parent. */
  stackTasksVerticallyUnderParents(laidOut, edges)

  for (const node of laidOut) {
    const dim = NODE_DIMS[kindFromNodeId(node.id)]
    maxX = Math.max(maxX, node.position.x + dim.width)
    maxY = Math.max(maxY, node.position.y + dim.height)
  }

  const orphanStartX = maxX + 64
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
