"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import "../strategy-map.css"
import { toast } from "sonner"
import {
  updateObjective,
  updateProject,
  updateTask,
} from "@/lib/actions/operations"
import type {
  AdminUserMin,
  Goal,
  Objective,
  Project,
  Task,
} from "@/lib/types/operations"
import { GoalNode } from "./nodes/goal-node"
import { ObjectiveNode } from "./nodes/objective-node"
import { ProjectNode } from "./nodes/project-node"
import { TaskNode } from "./nodes/task-node"
import { RelationEdge } from "./edges/relation-edge"
import {
  buildGraph,
  mergeNodePositions,
  type StrategyMapEntities,
} from "./utils/build-graph"
import {
  filterEntitiesForToolbar,
  nodeTitle,
} from "./utils/filter-entities"
import {
  applySubtreeFocus,
  type StrategyMapSubtreeFocus,
} from "./utils/subtree-focus"
import {
  StrategyMapFocusProvider,
} from "./strategy-map-focus-context"
import {
  isValidConnection,
  parseNodeId,
} from "./utils/validate-connection"
import type { RelationKind } from "./utils/build-graph"
import {
  MapToolbar,
  defaultToolbarState,
  type MapToolbarState,
} from "./toolbar/map-toolbar"
import {
  NodeDetailPanel,
  type StrategyMapEntityDeletedPayload,
} from "./panels/node-detail-panel"
import type { StrategyMapConnectionItem } from "./panels/strategy-map-connections-card"
import {
  StrategyMapHighlightProvider,
  useStrategyMapHighlightActions,
} from "./strategy-map-highlight-context"
import { EdgeDeleteProvider } from "./edge-delete-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { GraphEntityKind } from "./utils/validate-connection"

const nodeTypes = {
  goal: GoalNode,
  objective: ObjectiveNode,
  project: ProjectNode,
  task: TaskNode,
}

const edgeTypes = {
  relation: RelationEdge,
}

export type StrategyMapInitialData = StrategyMapEntities

function linkObjectiveProject(
  e: StrategyMapEntities,
  objectiveId: string,
  projectId: string
): StrategyMapEntities {
  return {
    ...e,
    projects: e.projects.map((p) =>
      p.id === projectId ? { ...p, objective_id: objectiveId } : p
    ),
  }
}

function linkObjectiveTask(
  e: StrategyMapEntities,
  objectiveId: string,
  taskId: string
): StrategyMapEntities {
  return {
    ...e,
    tasks: e.tasks.map((t) =>
      t.id === taskId
        ? { ...t, objective_id: objectiveId, project_id: null }
        : t
    ),
  }
}

function linkProjectTask(
  e: StrategyMapEntities,
  projectId: string,
  taskId: string
): StrategyMapEntities {
  const project = e.projects.find((p) => p.id === projectId)
  const objectiveId = project?.objective_id ?? null
  return {
    ...e,
    tasks: e.tasks.map((t) =>
      t.id === taskId ? { ...t, project_id: projectId, objective_id: objectiveId } : t
    ),
  }
}

function unlinkObjectiveProject(
  e: StrategyMapEntities,
  projectId: string
): StrategyMapEntities {
  return {
    ...e,
    projects: e.projects.map((p) =>
      p.id === projectId
        ? { ...p, objective_id: null, key_result_id: null }
        : p
    ),
  }
}

function unlinkObjectiveTask(
  e: StrategyMapEntities,
  taskId: string
): StrategyMapEntities {
  return {
    ...e,
    tasks: e.tasks.map((t) =>
      t.id === taskId ? { ...t, objective_id: null } : t
    ),
  }
}

function unlinkProjectTask(
  e: StrategyMapEntities,
  taskId: string
): StrategyMapEntities {
  return {
    ...e,
    tasks: e.tasks.map((t) =>
      t.id === taskId ? { ...t, project_id: null } : t
    ),
  }
}

function linkGoalObjective(
  e: StrategyMapEntities,
  goalId: string,
  objectiveId: string
): StrategyMapEntities {
  const goal = e.goals.find((g) => g.id === goalId)
  const goalMin = goal ? { id: goal.id, title: goal.title } : null
  return {
    ...e,
    objectives: e.objectives.map((o) =>
      o.id === objectiveId
        ? { ...o, goal_id: goalId, goal: goalMin }
        : o
    ),
  }
}

function unlinkGoalObjective(
  e: StrategyMapEntities,
  objectiveId: string
): StrategyMapEntities {
  return {
    ...e,
    objectives: e.objectives.map((o) =>
      o.id === objectiveId ? { ...o, goal_id: null, goal: null } : o
    ),
  }
}

function InnerCanvas({
  initial,
  admins,
}: {
  initial: StrategyMapInitialData
  admins: AdminUserMin[]
}) {
  const [entities, setEntities] = useState<StrategyMapEntities>(() => ({
    goals: initial.goals ?? [],
    objectives: initial.objectives,
    projects: initial.projects,
    tasks: initial.tasks,
  }))
  const [toolbar, setToolbar] = useState<MapToolbarState>(defaultToolbarState)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetKind, setSheetKind] = useState<GraphEntityKind | null>(null)
  const [sheetRecord, setSheetRecord] = useState<
    Goal | Objective | Project | Task | null
  >(null)
  const [pendingEdgeDelete, setPendingEdgeDelete] = useState<string | null>(
    null
  )
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const fullscreenRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { setHighlightFromNode } = useStrategyMapHighlightActions()

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current)
    }
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  }, [])

  useEffect(() => {
    if (!isFullscreen) return
    const id = window.requestAnimationFrame(() => {
      rfRef.current?.fitView({ padding: 0.12, duration: 250 })
    })
    return () => window.cancelAnimationFrame(id)
  }, [isFullscreen])

  const toggleFullscreen = useCallback(async () => {
    const el = fullscreenRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      toast.error("Kunde inte växla helskärm (stöds inte eller nekades)")
    }
  }, [])

  const [subtreeFocus, setSubtreeFocus] = useState<StrategyMapSubtreeFocus | null>(
    null
  )

  const toggleObjectiveFocus = useCallback((id: string) => {
    setSubtreeFocus((prev) =>
      prev?.kind === "objective" && prev.id === id
        ? null
        : { kind: "objective", id }
    )
  }, [])

  const toggleProjectFocus = useCallback((id: string) => {
    setSubtreeFocus((prev) =>
      prev?.kind === "project" && prev.id === id ? null : { kind: "project", id }
    )
  }, [])

  const clearSubtreeFocus = useCallback(() => setSubtreeFocus(null), [])

  const focusContextValue = useMemo(
    () => ({
      focus: subtreeFocus,
      toggleObjectiveFocus,
      toggleProjectFocus,
      clearFocus: clearSubtreeFocus,
    }),
    [subtreeFocus, toggleObjectiveFocus, toggleProjectFocus, clearSubtreeFocus]
  )

  const afterSubtreeFocus = useMemo(
    () => applySubtreeFocus(entities, subtreeFocus),
    [entities, subtreeFocus]
  )

  const filtered = useMemo(
    () => filterEntitiesForToolbar(afterSubtreeFocus, toolbar),
    [afterSubtreeFocus, toolbar]
  )

  useEffect(() => {
    if (!subtreeFocus) return
    const id = window.requestAnimationFrame(() => {
      rfRef.current?.fitView({ padding: 0.15, duration: 280 })
    })
    return () => window.cancelAnimationFrame(id)
  }, [subtreeFocus])

  const searchQ = toolbar.search.trim().toLowerCase()

  useEffect(() => {
    const { nodes: freshNodes, edges: freshEdges } = buildGraph(filtered)
    setNodes((prev) => {
      const merged = mergeNodePositions(prev, freshNodes)
      return merged.map((node) => ({
        ...node,
        data: {
          ...node.data,
          searchDimmed:
            searchQ.length > 0 &&
            !nodeTitle({
              type: node.type,
              data: node.data as { record: Objective | Project | Task },
            })
              .toLowerCase()
              .includes(searchQ),
        },
      }))
    })
    setEdges(freshEdges)
  }, [filtered, searchQ, setNodes, setEdges])

  const onEdgeDeleteClick = useCallback((edgeId: string) => {
    setPendingEdgeDelete(edgeId)
  }, [])

  const handleConfirmEdgeDelete = useCallback(async () => {
    if (!pendingEdgeDelete) return
    const edge = edges.find((e) => e.id === pendingEdgeDelete)
    setPendingEdgeDelete(null)
    if (!edge) return

    const rel = edge.data?.relation as RelationKind | undefined
    const target = parseNodeId(edge.target)
    if (!target || !rel) {
      toast.error("Kunde inte tolka kopplingen")
      return
    }

    try {
      if (rel === "goal-objective") {
        await updateObjective(target.id, { goal_id: null })
        setEntities((e) => unlinkGoalObjective(e, target.id))
      } else if (rel === "objective-project") {
        await updateProject(target.id, {
          objective_id: null,
          key_result_id: null,
        })
        setEntities((e) => unlinkObjectiveProject(e, target.id))
      } else if (rel === "objective-task") {
        await updateTask(target.id, { objective_id: null })
        setEntities((e) => unlinkObjectiveTask(e, target.id))
      } else if (rel === "project-task") {
        await updateTask(target.id, { project_id: null })
        setEntities((e) => unlinkProjectTask(e, target.id))
      }
      toast.success("Koppling borttagen")
    } catch {
      toast.error("Kunde inte ta bort kopplingen")
    }
  }, [pendingEdgeDelete, edges])

  const isValidRFConnection = useCallback(
    (connection: Connection) => {
      const s = parseNodeId(connection.source ?? "")
      const t = parseNodeId(connection.target ?? "")
      if (!s || !t) return false
      return isValidConnection(s.kind, t.kind)
    },
    []
  )

  const onConnect = useCallback(
    async (connection: Connection) => {
      const s = parseNodeId(connection.source ?? "")
      const t = parseNodeId(connection.target ?? "")
      if (!s || !t || !isValidConnection(s.kind, t.kind)) {
        toast.error("Ogiltig koppling")
        return
      }

      const dup = edges.some(
        (e) => e.source === connection.source && e.target === connection.target
      )
      if (dup) {
        toast.error("Kopplingen finns redan")
        return
      }

      try {
        if (s.kind === "goal" && t.kind === "objective") {
          await updateObjective(t.id, { goal_id: s.id })
          setEntities((e) => linkGoalObjective(e, s.id, t.id))
        } else if (s.kind === "objective" && t.kind === "project") {
          await updateProject(t.id, { objective_id: s.id })
          setEntities((e) => linkObjectiveProject(e, s.id, t.id))
        } else if (s.kind === "objective" && t.kind === "task") {
          await updateTask(t.id, {
            objective_id: s.id,
            project_id: null,
          })
          setEntities((e) => linkObjectiveTask(e, s.id, t.id))
        } else if (s.kind === "project" && t.kind === "task") {
          const proj = entities.projects.find((p) => p.id === s.id)
          await updateTask(t.id, {
            project_id: s.id,
            objective_id: proj?.objective_id ?? null,
          })
          setEntities((e) => linkProjectTask(e, s.id, t.id))
        }
        toast.success("Koppling skapad")
      } catch {
        toast.error("Kunde inte skapa koppling")
      }
    },
    [edges, entities]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const parsed = parseNodeId(node.id)
      if (!parsed) return
      const kind = parsed.kind
      let record: Goal | Objective | Project | Task | null = null
      if (kind === "goal")
        record = entities.goals.find((g) => g.id === parsed.id) ?? null
      else if (kind === "objective")
        record = entities.objectives.find((o) => o.id === parsed.id) ?? null
      else if (kind === "project")
        record = entities.projects.find((p) => p.id === parsed.id) ?? null
      else record = entities.tasks.find((t) => t.id === parsed.id) ?? null
      setSheetKind(kind)
      setSheetRecord(record)
      setSheetOpen(true)
    },
    [entities]
  )

  const connectionItems = useMemo((): StrategyMapConnectionItem[] => {
    if (!sheetRecord || !sheetKind) return []
    const items: StrategyMapConnectionItem[] = []
    if (sheetKind === "goal") {
      const g = sheetRecord as Goal
      entities.objectives
        .filter((o) => o.goal_id === g.id)
        .forEach((o) =>
          items.push({
            id: `obj-${o.id}`,
            category: "objective",
            label: "Objective",
            title: o.title,
          })
        )
    } else if (sheetKind === "objective") {
      const o = sheetRecord as Objective
      entities.projects
        .filter((p) => p.objective_id === o.id)
        .forEach((p) =>
          items.push({
            id: `proj-${p.id}`,
            category: "project",
            label: "Projekt",
            title: p.name,
          })
        )
      entities.tasks
        .filter((t) => t.objective_id === o.id && !t.project_id)
        .forEach((t) =>
          items.push({
            id: `task-${t.id}`,
            category: "task",
            label: "Task (direkt)",
            title: t.title,
          })
        )
    } else if (sheetKind === "project") {
      const p = sheetRecord as Project
      if (p.objective_id) {
        const o = entities.objectives.find((x) => x.id === p.objective_id)
        if (o) {
          items.push({
            id: `obj-${o.id}`,
            category: "objective",
            label: "Objective",
            title: o.title,
          })
        }
      }
      const n = entities.tasks.filter((t) => t.project_id === p.id).length
      items.push({
        id: `task-count-${p.id}`,
        category: "aggregate",
        label: "Tasks",
        title:
          n === 0
            ? "Inga tasks kopplade till projektet"
            : n === 1
              ? "1 kopplad task"
              : `${n} kopplade tasks`,
      })
    } else {
      const t = sheetRecord as Task
      if (t.objective_id) {
        const o = entities.objectives.find((x) => x.id === t.objective_id)
        if (o) {
          items.push({
            id: `obj-${o.id}`,
            category: "objective",
            label: "Objective",
            title: o.title,
          })
        }
      }
      if (t.project_id) {
        const p = entities.projects.find((x) => x.id === t.project_id)
        if (p) {
          items.push({
            id: `proj-${p.id}`,
            category: "project",
            label: "Projekt",
            title: p.name,
          })
        }
      }
    }
    return items
  }, [sheetRecord, sheetKind, entities])

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setHighlightFromNode(node.id, edges)
    },
    [edges, setHighlightFromNode]
  )

  const onNodeMouseLeave = useCallback(() => {
    setHighlightFromNode(null, edges)
  }, [edges, setHighlightFromNode])

  const onMoveEnd = useCallback(() => {
    setHighlightFromNode(null, edges)
  }, [edges, setHighlightFromNode])

  const handleEntityDeletedFromPanel = useCallback(
    (payload: StrategyMapEntityDeletedPayload) => {
      setEntities((e) => {
        if (payload.kind === "task") {
          return {
            ...e,
            tasks: e.tasks.filter((t) => t.id !== payload.id),
          }
        }
        if (payload.kind === "project") {
          return {
            ...e,
            projects: e.projects.filter((p) => p.id !== payload.id),
            tasks: e.tasks.filter((t) => t.project_id !== payload.id),
          }
        }
        const objId = payload.id
        const removedProjectIds = new Set(
          e.projects
            .filter((p) => p.objective_id === objId)
            .map((p) => p.id)
        )
        return {
          ...e,
          objectives: e.objectives.filter((o) => o.id !== objId),
          projects: e.projects.filter((p) => p.objective_id !== objId),
          tasks: e.tasks.filter(
            (t) =>
              t.objective_id !== objId &&
              (t.project_id == null || !removedProjectIds.has(t.project_id))
          ),
        }
      })
      setSheetOpen(false)
      setSheetKind(null)
      setSheetRecord(null)
    },
    []
  )

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "relation" as const,
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    }),
    []
  )

  return (
    <EdgeDeleteProvider onEdgeDeleteClick={onEdgeDeleteClick}>
      <StrategyMapFocusProvider value={focusContextValue}>
      <div
        ref={fullscreenRef}
        className={
          isFullscreen
            ? "flex h-screen min-h-0 w-full flex-col gap-3 bg-zinc-100 p-3 dark:bg-zinc-950"
            : "flex h-[calc(100dvh-8rem)] min-h-[480px] w-full flex-col gap-3"
        }
      >
        {subtreeFocus && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-100"
            role="status"
          >
            <span>
              Filtrerad vy: endast{" "}
              {subtreeFocus.kind === "objective"
                ? "detta objective och kopplade projekt/tasks"
                : "detta projekt och kopplade tasks (samt objective & mål)"}
            </span>
            <button
              type="button"
              onClick={clearSubtreeFocus}
              className="shrink-0 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-medium text-indigo-900 hover:bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800"
            >
              Visa allt
            </button>
          </div>
        )}
        <MapToolbar
          value={toolbar}
          onChange={setToolbar}
          onFitView={() =>
            rfRef.current?.fitView({ padding: 0.2, duration: 300 })
          }
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
        />
        <div className="strategy-map-flow relative min-h-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-100/90 dark:border-zinc-700 dark:bg-zinc-950/80">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onInit={(inst) => {
              rfRef.current = inst
            }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onMoveEnd={onMoveEnd}
            isValidConnection={isValidRFConnection}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            minZoom={0.08}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} className="dark:bg-zinc-950" />
            <Controls className="!shadow-md" />
            <MiniMap
              className="!rounded-lg !border !border-gray-200 dark:!border-zinc-700"
              nodeColor={(n) => {
                if (n.type === "goal") return "#7c3aed"
                if (n.type === "objective") return "#6366f1"
                if (n.type === "project") return "#d97706"
                return "#059669"
              }}
              maskColor="rgba(0,0,0,0.12)"
            />
          </ReactFlow>
        </div>
      </div>

      </StrategyMapFocusProvider>

      <NodeDetailPanel
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        kind={sheetKind}
        record={sheetRecord}
        connectionItems={connectionItems}
        onEntityDeleted={handleEntityDeletedFromPanel}
        sheetPortalContainer={
          isFullscreen ? fullscreenRef.current ?? null : null
        }
        taskEditContext={{
          objectives: entities.objectives,
          projects: entities.projects,
          admins,
          onTaskUpdated: (task) => {
            setEntities((e) => ({
              ...e,
              tasks: e.tasks.map((t) => (t.id === task.id ? task : t)),
            }))
            setSheetRecord(task)
          },
        }}
      />

      <AlertDialog
        open={pendingEdgeDelete !== null}
        onOpenChange={(open) => !open && setPendingEdgeDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort koppling?</AlertDialogTitle>
            <AlertDialogDescription>
              Relationen tas bort i databasen. Noderna finns kvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmEdgeDelete()}>
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EdgeDeleteProvider>
  )
}

export function StrategyMapCanvas({
  initial,
  admins,
}: {
  initial: StrategyMapInitialData
  admins: AdminUserMin[]
}) {
  return (
    <ReactFlowProvider>
      <StrategyMapHighlightProvider>
        <InnerCanvas initial={initial} admins={admins} />
      </StrategyMapHighlightProvider>
    </ReactFlowProvider>
  )
}
