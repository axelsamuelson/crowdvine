"use client"

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react"
import { Button } from "@/components/ui/button"
import { useEdgeDelete } from "../edge-delete-context"
import type { RelationKind } from "../utils/build-graph"

type RelationEdgeData = {
  label?: string
  relation?: RelationKind
}

export function RelationEdge({
  id,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps<RelationEdgeData>) {
  const { onEdgeDeleteClick } = useEdgeDelete()
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const label = data?.label ?? "link"

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        className={selected ? undefined : "sm-flow-edge-path"}
        interactionWidth={16}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan flex flex-col items-center gap-1"
        >
          <span className="rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
            {label}
          </span>
          {selected && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-7 text-xs px-2"
              onClick={(e) => {
                e.stopPropagation()
                onEdgeDeleteClick(id)
              }}
            >
              Ta bort
            </Button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
