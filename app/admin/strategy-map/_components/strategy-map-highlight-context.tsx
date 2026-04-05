"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Edge } from "@xyflow/react"

type HighlightState = {
  /** When non-null, nodes not in this set render dimmed. */
  activeIds: Set<string> | null
  setHighlightFromNode: (nodeId: string | null, edges: Edge[]) => void
}

const StrategyMapHighlightContext = createContext<HighlightState | null>(null)

function collectConnectedIds(startId: string, edges: Edge[]): Set<string> {
  const ids = new Set<string>([startId])
  let added = true
  while (added) {
    added = false
    for (const e of edges) {
      if (ids.has(e.source) && !ids.has(e.target)) {
        ids.add(e.target)
        added = true
      }
      if (ids.has(e.target) && !ids.has(e.source)) {
        ids.add(e.source)
        added = true
      }
    }
  }
  return ids
}

export function StrategyMapHighlightProvider({ children }: { children: ReactNode }) {
  const [activeIds, setActiveIds] = useState<Set<string> | null>(null)

  const setHighlightFromNode = useCallback(
    (nodeId: string | null, currentEdges: Edge[]) => {
      if (!nodeId) {
        setActiveIds(null)
        return
      }
      setActiveIds(collectConnectedIds(nodeId, currentEdges))
    },
    []
  )

  const value = useMemo(
    () => ({ activeIds, setHighlightFromNode }),
    [activeIds, setHighlightFromNode]
  )

  return (
    <StrategyMapHighlightContext.Provider value={value}>
      {children}
    </StrategyMapHighlightContext.Provider>
  )
}

/** Re-bind edges when they change — provider needs current edges for BFS. */
export function useStrategyMapHighlight(nodeId: string): {
  isDimmed: boolean
} {
  const ctx = useContext(StrategyMapHighlightContext)
  const activeIds = ctx?.activeIds
  const isDimmed =
    activeIds !== null && activeIds !== undefined && !activeIds.has(nodeId)
  return { isDimmed }
}

export function useStrategyMapHighlightActions() {
  const ctx = useContext(StrategyMapHighlightContext)
  if (!ctx) {
    return {
      setHighlightFromNode: (_id: string | null, _edges: Edge[]) => {},
    }
  }
  return { setHighlightFromNode: ctx.setHighlightFromNode }
}
