import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
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
          .select("*")
          .eq("objective_id", objective_id)
          .order("slug");

        if (error) return mcpErrorResult(error.message);
        return mcpJsonResult({
          objective_id,
          metrics: data ?? [],
          refresh_error: rpcErr?.message ?? null,
        });
      } catch (e) {
        return mcpErrorResult(e instanceof Error ? e.message : String(e));
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
          if (eErr) return mcpErrorResult(eErr.message);

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

        return mcpJsonResult({
          ...overview,
          total_bottles_reserved_or_ordered: total_bottles,
          note:
            "total_bottles_reserved_or_ordered sums order_reservation_items.quantity when tabellen finns.",
        });
      } catch (e) {
        return mcpErrorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "get_full_strategy",
    {
      description:
        "Hämta hela OKR-strukturen: alla goals med objectives, projects och tasks i en trädstruktur.",
      inputSchema: {
        include_completed: z.boolean().optional().default(false),
      },
    },
    async ({ include_completed = false }) => {
      try {
        let gq = sb
          .from("admin_goals")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (!include_completed) {
          gq = gq.neq("status", "completed").neq("status", "cancelled");
        }
        const { data: goals, error: gErr } = await gq;
        if (gErr) return mcpErrorResult(gErr.message);

        let oq = sb
          .from("admin_objectives")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (!include_completed) {
          oq = oq.neq("status", "completed").neq("status", "archived");
        }
        const { data: allObjectives, error: oErr } = await oq;
        if (oErr) return mcpErrorResult(oErr.message);

        let pq = sb
          .from("admin_projects")
          .select("*")
          .is("deleted_at", null);
        if (!include_completed) {
          pq = pq.neq("status", "completed").neq("status", "archived");
        }
        const { data: allProjects, error: pErr } = await pq;
        if (pErr) return mcpErrorResult(pErr.message);

        let tq = sb.from("admin_tasks").select("*").is("deleted_at", null);
        if (!include_completed) {
          tq = tq.neq("status", "done").neq("status", "cancelled");
        }
        const { data: allTasks, error: tErr } = await tq;
        if (tErr) return mcpErrorResult(tErr.message);

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
          const objs = (objectivesByGoal.get(goal.id as string) ?? []).map(
            (obj) => {
              const projects = (projectsByObjective.get(obj.id as string) ?? []).map(
                (proj) => ({
                  ...proj,
                  title: proj.name,
                  tasks: tasksByProject.get(proj.id as string) ?? [],
                }),
              );
              return {
                ...obj,
                projects,
                orphan_tasks: tasksByObjective.get(obj.id as string) ?? [],
              };
            },
          );
          return { ...goal, objectives: objs };
        });

        const unassignedObjectives = objectivesByGoal.get(null) ?? [];
        return mcpJsonResult({
          goals: tree,
          objectives_without_goal: unassignedObjectives.map((obj) => ({
            ...obj,
            projects: (projectsByObjective.get(obj.id as string) ?? []).map(
              (proj) => ({
                ...proj,
                title: proj.name,
                tasks: tasksByProject.get(proj.id as string) ?? [],
              }),
            ),
            orphan_tasks: tasksByObjective.get(obj.id as string) ?? [],
          })),
        });
      } catch (e) {
        return mcpErrorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );
}
