export type GraphEntityKind = "goal" | "objective" | "project" | "task"

const VALID: Record<GraphEntityKind, GraphEntityKind[]> = {
  goal: ["objective"],
  objective: ["project", "task"],
  project: ["task"],
  task: [],
}

export function isValidConnection(
  sourceKind: GraphEntityKind,
  targetKind: GraphEntityKind
): boolean {
  return VALID[sourceKind]?.includes(targetKind) ?? false
}

export function parseNodeId(
  nodeId: string
): { kind: GraphEntityKind; id: string } | null {
  const i = nodeId.indexOf(":")
  if (i === -1) return null
  const kind = nodeId.slice(0, i) as GraphEntityKind
  const id = nodeId.slice(i + 1)
  if (
    !id ||
    (kind !== "goal" &&
      kind !== "objective" &&
      kind !== "project" &&
      kind !== "task")
  ) {
    return null
  }
  return { kind, id }
}

export function makeNodeId(kind: GraphEntityKind, id: string): string {
  return `${kind}:${id}`
}
