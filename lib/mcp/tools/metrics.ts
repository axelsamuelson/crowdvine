import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MCP_ADMIN_TASK_SELECT_LIST } from "../utils/mcp-admin-task-select";
import {
  MCP_OBJECTIVE_COUNTING_COLUMNS,
  MCP_OBJECTIVE_METRIC_BRIEF_COLUMNS,
  MCP_STRATEGY_GOAL_COLUMNS,
  MCP_STRATEGY_OBJECTIVE_COLUMNS,
  MCP_STRATEGY_PROJECT_COLUMNS,
  MCP_TASK_COUNTING_COLUMNS,
} from "../utils/mcp-strategy-selects";
import { nestAdminTasksWithSubtasks } from "../utils/nest-admin-tasks";
import { mcpJsonResult, mcpErrorResult } from "../utils/tool-result";

type FunnelRow = {
  user_id: string;
  first_login_at: string | null;
  first_product_view_at: string | null;
  first_add_to_cart_at: string | null;
  reservation_completed_at: string | null;
};

function aggregateFunnel(rows: FunnelRow[]) {
  return {
    users_tracked: rows.length,
    signups_first_login: rows.filter((r) => r.first_login_at).length,
    product_views: rows.filter((r) => r.first_product_view_at).length,
    add_to_cart: rows.filter((r) => r.first_add_to_cart_at).length,
    orders_reservation_completed: rows.filter((r) => r.reservation_completed_at)
      .length,
  };
}

type TaskCountRow = {
  id: string;
  project_id: string | null;
  objective_id: string | null;
};

function countTasksInScope(
  tasks: TaskCountRow[],
  objectiveIds: Set<string>,
  projectIds: Set<string>,
): number {
  let n = 0;
  for (const t of tasks) {
    if (t.project_id && projectIds.has(t.project_id)) {
      n++;
      continue;
    }
    if (t.objective_id && objectiveIds.has(t.objective_id)) n++;
  }
  return n;
}

type DetailLevel = "summary" | "standard" | "full";

function projectRowTitle(p: Record<string, unknown>): string {
  return typeof p.name === "string" ? p.name : "";
}

async function buildFullStrategyPayload(
  sb: SupabaseClient,
  include_completed: boolean,
  detail_level: DetailLevel,
): Promise<unknown> {
  let gq = sb
    .from("admin_goals")
    .select(MCP_STRATEGY_GOAL_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (!include_completed) {
    gq = gq.neq("status", "completed").neq("status", "cancelled");
  }
  const { data: goals, error: gErr } = await gq;
  if (gErr) throw new Error(gErr.message);

  let oq =
    detail_level === "summary"
      ? sb
          .from("admin_objectives")
          .select(MCP_OBJECTIVE_COUNTING_COLUMNS)
          .is("deleted_at", null)
      : sb
          .from("admin_objectives")
          .select(MCP_STRATEGY_OBJECTIVE_COLUMNS)
          .is("deleted_at", null);
  oq = oq.order("created_at", { ascending: false });
  if (!include_completed) {
    oq = oq
      .neq("status", "completed")
      .neq("status", "archived")
      .neq("status", "paused");
  }
  const { data: allObjectives, error: oErr } = await oq;
  if (oErr) throw new Error(oErr.message);

  let pq =
    detail_level === "summary"
      ? sb
          .from("admin_projects")
          .select("id, objective_id")
          .is("deleted_at", null)
      : sb
          .from("admin_projects")
          .select(MCP_STRATEGY_PROJECT_COLUMNS)
          .is("deleted_at", null);
  if (!include_completed) {
    pq = pq
      .neq("status", "completed")
      .neq("status", "archived")
      .neq("status", "paused");
  }
  const { data: allProjects, error: pErr } = await pq;
  if (pErr) throw new Error(pErr.message);

  const objectivesByGoal = new Map<string | null, typeof allObjectives>();
  for (const obj of allObjectives ?? []) {
    const gid = (obj.goal_id as string | null) ?? null;
    const list = objectivesByGoal.get(gid) ?? [];
    list.push(obj);
    objectivesByGoal.set(gid, list);
  }

  const projectsByObjective = new Map<string, typeof allProjects>();
  for (const p of allProjects ?? []) {
    const oid = p.objective_id as string | null;
    if (!oid) continue;
    const list = projectsByObjective.get(oid) ?? [];
    list.push(p);
    projectsByObjective.set(oid, list);
  }

  if (detail_level === "summary") {
    let tq = sb
      .from("admin_tasks")
      .select(MCP_TASK_COUNTING_COLUMNS)
      .is("deleted_at", null);
    if (!include_completed) {
      tq = tq
        .neq("status", "done")
        .neq("status", "cancelled")
        .neq("status", "paused");
    }
    const { data: countTasks, error: tErr } = await tq;
    if (tErr) throw new Error(tErr.message);
    const allTasks = (countTasks ?? []) as TaskCountRow[];

    const goalsOut = (goals ?? []).map((goal) => {
      const objs = objectivesByGoal.get(goal.id as string) ?? [];
      const objectiveIds = new Set(objs.map((o) => o.id as string));
      const projectIds = new Set<string>();
      for (const oid of objectiveIds) {
        for (const pr of projectsByObjective.get(oid) ?? []) {
          projectIds.add(pr.id as string);
        }
      }
      return {
        ...goal,
        objective_count: objs.length,
        project_count: projectIds.size,
        task_count: countTasksInScope(allTasks, objectiveIds, projectIds),
      };
    });

    const unassigned = objectivesByGoal.get(null) ?? [];
    const objectivesWithoutGoal = unassigned.map((obj) => {
      const oid = obj.id as string;
      const objectiveIds = new Set([oid]);
      const projectIds = new Set(
        (projectsByObjective.get(oid) ?? []).map((p) => p.id as string),
      );
      return {
        id: oid,
        title: obj.title,
        status: obj.status,
        project_count: projectIds.size,
        task_count: countTasksInScope(allTasks, objectiveIds, projectIds),
      };
    });

    return {
      detail_level: "summary" as const,
      include_completed,
      goals: goalsOut,
      totals: {
        objectives: (allObjectives ?? []).length,
        projects: (allProjects ?? []).length,
        tasks: allTasks.length,
      },
      objectives_without_goal: objectivesWithoutGoal,
    };
  }

  if (detail_level === "standard") {
    const tree = (goals ?? []).map((goal) => {
      const objs = (objectivesByGoal.get(goal.id as string) ?? []).map(
        (obj) => {
          const projects = (projectsByObjective.get(obj.id as string) ?? []).map(
            (proj) => ({
              ...proj,
              title: projectRowTitle(proj as Record<string, unknown>),
            }),
          );
          return {
            ...obj,
            projects,
            orphan_tasks: [],
          };
        },
      );
      return { ...goal, objectives: objs };
    });

    const unassignedObjectives = objectivesByGoal.get(null) ?? [];
    return {
      detail_level: "standard" as const,
      include_completed,
      goals: tree,
      objectives_without_goal: unassignedObjectives.map((obj) => ({
        ...obj,
        projects: (projectsByObjective.get(obj.id as string) ?? []).map(
          (proj) => ({
            ...proj,
            title: projectRowTitle(proj as Record<string, unknown>),
          }),
        ),
        orphan_tasks: [],
      })),
    };
  }

  let tq = sb
    .from("admin_tasks")
    .select(MCP_ADMIN_TASK_SELECT_LIST)
    .is("deleted_at", null);
  if (!include_completed) {
    tq = tq
      .neq("status", "done")
      .neq("status", "cancelled")
      .neq("status", "paused");
  }
  const { data: allTasks, error: tErr } = await tq;
  if (tErr) throw new Error(tErr.message);

  const tasksByProject = new Map<string, typeof allTasks>();
  const tasksByObjective = new Map<string, typeof allTasks>();
  for (const t of allTasks ?? []) {
    const pid = t.project_id as string | null;
    if (pid) {
      const list = tasksByProject.get(pid) ?? [];
      list.push(t);
      tasksByProject.set(pid, list);
    }
    const oid = t.objective_id as string | null;
    if (oid && !pid) {
      const list = tasksByObjective.get(oid) ?? [];
      list.push(t);
      tasksByObjective.set(oid, list);
    }
  }

  const tree = (goals ?? []).map((goal) => {
    const objs = (objectivesByGoal.get(goal.id as string) ?? []).map((obj) => {
      const projects = (projectsByObjective.get(obj.id as string) ?? []).map(
        (proj) => ({
          ...proj,
          title: projectRowTitle(proj as Record<string, unknown>),
          tasks: nestAdminTasksWithSubtasks(
            tasksByProject.get(proj.id as string) ?? [],
          ),
        }),
      );
      return {
        ...obj,
        projects,
        orphan_tasks: nestAdminTasksWithSubtasks(
          tasksByObjective.get(obj.id as string) ?? [],
        ),
      };
    });
    return { ...goal, objectives: objs };
  });

  const unassignedObjectives = objectivesByGoal.get(null) ?? [];
  return {
    detail_level: "full" as const,
    include_completed,
    goals: tree,
    objectives_without_goal: unassignedObjectives.map((obj) => ({
      ...obj,
      projects: (projectsByObjective.get(obj.id as string) ?? []).map(
        (proj) => ({
          ...proj,
          title: projectRowTitle(proj as Record<string, unknown>),
          tasks: nestAdminTasksWithSubtasks(
            tasksByProject.get(proj.id as string) ?? [],
          ),
        }),
      ),
      orphan_tasks: nestAdminTasksWithSubtasks(
        tasksByObjective.get(obj.id as string) ?? [],
      ),
    })),
  };
}

export function registerMetricsTools(server: McpServer, sb: SupabaseClient) {
  server.registerTool(
    "get_metrics",
    {
      description:
        "Hämta live-metrics för ett objective (signups, konvertering, AOQ, etc.). Uppdaterar cache via admin_refresh_objective_metrics om möjligt.",
      inputSchema: {
        objective_id: z.string(),
      },
    },
    async ({ objective_id }) => {
      try {
        const { error: rpcErr } = await sb.rpc("admin_refresh_objective_metrics", {
          p_objective_id: objective_id,
        });
        if (rpcErr) {
          // Continue with last cached rows if RPC fails (e.g. old DB)
        }

        const { data, error } = await sb
          .from("admin_objective_metrics")
          .select(MCP_OBJECTIVE_METRIC_BRIEF_COLUMNS)
          .eq("objective_id", objective_id)
          .order("slug");

        if (error) return mcpErrorResult(error.message, "get_metrics");
        return mcpJsonResult(
          {
            objective_id,
            metrics: data ?? [],
            refresh_error: rpcErr?.message ?? null,
          },
          {
            tool: "get_metrics",
            rowCount: (data ?? []).length,
          },
        );
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_metrics",
        );
      }
    },
  );

  server.registerTool(
    "get_funnel_overview",
    {
      description:
        "Hämta en översikt av hela funneln: signups, product views, add to cart, orders, flaskor.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const { data: funnelRows, error: fErr } = await sb
          .from("user_journey_funnel")
          .select(
            "user_id, first_login_at, first_product_view_at, first_add_to_cart_at, reservation_completed_at",
          );

        let funnel: FunnelRow[] = (funnelRows ?? []) as FunnelRow[];
        if (fErr) {
          const { data: events, error: eErr } = await sb
            .from("user_events")
            .select("user_id, event_type, created_at")
            .not("user_id", "is", null);
          if (eErr) return mcpErrorResult(eErr.message, "get_funnel_overview");

          const usersMap = new Map<string, FunnelRow>();
          for (const ev of events ?? []) {
            const uid = ev.user_id as string;
            if (!usersMap.has(uid)) {
              usersMap.set(uid, {
                user_id: uid,
                first_login_at: null,
                first_product_view_at: null,
                first_add_to_cart_at: null,
                reservation_completed_at: null,
              });
            }
            const u = usersMap.get(uid)!;
            const t = ev.event_type as string;
            const at = ev.created_at as string;
            if (t === "user_first_login" && !u.first_login_at) {
              u.first_login_at = at;
            } else if (t === "product_viewed" && !u.first_product_view_at) {
              u.first_product_view_at = at;
            } else if (t === "add_to_cart" && !u.first_add_to_cart_at) {
              u.first_add_to_cart_at = at;
            } else if (
              t === "reservation_completed" &&
              !u.reservation_completed_at
            ) {
              u.reservation_completed_at = at;
            }
          }
          funnel = [...usersMap.values()];
        }

        const overview = aggregateFunnel(funnel);

        let total_bottles: number | null = null;
        const { data: items, error: iErr } = await sb
          .from("order_reservation_items")
          .select("quantity");
        if (!iErr && items) {
          total_bottles = items.reduce(
            (acc, row) => acc + Number(row.quantity ?? 0),
            0,
          );
        }

        return mcpJsonResult(
          {
            ...overview,
            total_bottles_reserved_or_ordered: total_bottles,
            note:
              "total_bottles_reserved_or_ordered sums order_reservation_items.quantity when tabellen finns.",
          },
          {
            tool: "get_funnel_overview",
            rowCount: funnel.length,
          },
        );
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_funnel_overview",
        );
      }
    },
  );

  server.registerTool(
    "get_full_strategy",
    {
      description:
        "OKR-översikt. detail_level: summary (default, bara counts), standard (utan tasks), full (tasks+subtasks). Sätt detail_level=full när du behöver hela trädet.",
      inputSchema: {
        include_completed: z.boolean().optional().default(false),
        detail_level: z
          .enum(["summary", "standard", "full"])
          .optional()
          .default("summary")
          .describe(
            "summary = goals + räkningar; standard = struktur utan tasks; full = som tidigare med tasks.",
          ),
      },
    },
    async ({
      include_completed = false,
      detail_level = "summary",
    }: {
      include_completed?: boolean;
      detail_level?: DetailLevel;
    }) => {
      try {
        const payload = await buildFullStrategyPayload(
          sb,
          include_completed,
          detail_level,
        );
        const g = (payload as { goals?: unknown[] }).goals;
        return mcpJsonResult(payload, {
          tool: "get_full_strategy",
          rowCount: Array.isArray(g) ? g.length : undefined,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_full_strategy",
        );
      }
    },
  );
}
