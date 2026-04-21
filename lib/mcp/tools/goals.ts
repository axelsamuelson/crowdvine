import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getMcpActorProfileId } from "../utils/actor";
import { MCP_ADMIN_TASK_SELECT_LIST } from "../utils/mcp-admin-task-select";
import {
  MCP_KEY_RESULT_BRIEF_COLUMNS,
  MCP_STRATEGY_GOAL_COLUMNS,
  MCP_STRATEGY_OBJECTIVE_COLUMNS,
} from "../utils/mcp-strategy-selects";
import { nestAdminTasksWithSubtasks } from "../utils/nest-admin-tasks";
import { mcpJsonResult, mcpErrorResult } from "../utils/tool-result";
import { mcpWriteTool } from "../utils/write-tool";

async function objectiveCountsByGoalId(
  sb: SupabaseClient,
): Promise<Record<string, number>> {
  const { data, error } = await sb
    .from("admin_objectives")
    .select("goal_id")
    .is("deleted_at", null)
    .not("goal_id", "is", null);

  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const gid = row.goal_id as string;
    counts[gid] = (counts[gid] ?? 0) + 1;
  }
  return counts;
}

export function registerGoalTools(server: McpServer, sb: SupabaseClient) {
  server.registerTool(
    "list_goals",
    {
      description:
        "Lista alla strategiska goals i PACT. Returnerar id, titel, beskrivning, status och antal kopplade objectives.",
      inputSchema: {
        status: z
          .enum(["active", "completed", "paused", "cancelled"])
          .optional()
          .describe("Filtrera på status. Utelämna för alla."),
      },
    },
    async ({ status }) => {
      try {
        let q = sb
          .from("admin_goals")
          .select(MCP_STRATEGY_GOAL_COLUMNS)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (status) q = q.eq("status", status);
        const { data: goals, error } = await q;
        if (error) return mcpErrorResult(error.message, "list_goals");
        const counts = await objectiveCountsByGoalId(sb);
        const enriched = (goals ?? []).map((g) => ({
          ...g,
          objective_count: counts[g.id as string] ?? 0,
        }));
        return mcpJsonResult(enriched, {
          tool: "list_goals",
          rowCount: enriched.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_goals",
        );
      }
    },
  );

  server.registerTool(
    "get_goal",
    {
      description:
        "Ett goal + objectives (+ KRs). tasks endast om include_tasks=true (default false).",
      inputSchema: {
        goal_id: z.string().describe("Goal UUID"),
        include_tasks: z
          .boolean()
          .optional()
          .default(false)
          .describe("Sant = hämta och nästla tasks per objective."),
      },
    },
    async ({ goal_id, include_tasks: includeTasks = false }) => {
      try {
        const { data: goal, error: gErr } = await sb
          .from("admin_goals")
          .select(MCP_STRATEGY_GOAL_COLUMNS)
          .eq("id", goal_id)
          .is("deleted_at", null)
          .single();

        if (gErr) return mcpErrorResult(gErr.message, "get_goal");
        if (!goal) return mcpErrorResult("Goal not found", "get_goal");

        const goalObjectiveSelect = `${MCP_STRATEGY_OBJECTIVE_COLUMNS}, key_results:admin_key_results(${MCP_KEY_RESULT_BRIEF_COLUMNS}), goal:admin_goals(id, title)`;
        const { data: objectives, error: oErr } = await sb
          .from("admin_objectives")
          .select(goalObjectiveSelect)
          .eq("goal_id", goal_id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (oErr) return mcpErrorResult(oErr.message, "get_goal");

        const objList = objectives ?? [];
        const objectiveIds = objList.map((o) => o.id as string);
        const tasksByObjectiveId = new Map<string, Record<string, unknown>[]>();

        if (includeTasks && objectiveIds.length > 0) {
          const { data: goalTasks, error: gtErr } = await sb
            .from("admin_tasks")
            .select(MCP_ADMIN_TASK_SELECT_LIST)
            .in("objective_id", objectiveIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

          if (gtErr) return mcpErrorResult(gtErr.message, "get_goal");

          for (const t of goalTasks ?? []) {
            const oid = t.objective_id as string;
            const list = tasksByObjectiveId.get(oid) ?? [];
            list.push(t);
            tasksByObjectiveId.set(oid, list);
          }
        }

        const payload = {
          ...goal,
          include_tasks: includeTasks,
          objectives: objList.map((o) => ({
            ...o,
            ...(includeTasks
              ? {
                  tasks: nestAdminTasksWithSubtasks(
                    tasksByObjectiveId.get(o.id as string) ?? [],
                  ),
                }
              : {}),
          })),
          objective_count: objList.length,
        };
        return mcpJsonResult(payload, {
          tool: "get_goal",
          rowCount: objList.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_goal",
        );
      }
    },
  );

  server.registerTool(
    "create_goal",
    {
      description: "Skapa ett nytt strategiskt goal.",
      inputSchema: {
        title: z.string().describe("Titel på goal"),
        description: z.string().optional().describe("Beskrivning"),
        status: z
          .enum(["active", "completed", "paused", "cancelled"])
          .optional()
          .default("active"),
      },
    },
    async (args) => {
      const { title, description, status = "active" } = args;
      return mcpWriteTool(sb, "create_goal", args as Record<string, unknown>, async () => {
        const actor = await getMcpActorProfileId(sb);
        const { data, error } = await sb
          .from("admin_goals")
          .insert({
            title,
            description: description ?? null,
            status,
            created_by: actor,
          })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { ...data, objective_count: 0 };
      });
    },
  );

  server.registerTool(
    "update_goal",
    {
      description: "Uppdatera ett befintligt goal.",
      inputSchema: {
        goal_id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z
          .enum(["active", "completed", "paused", "cancelled"])
          .optional(),
      },
    },
    async (args) => {
      const { goal_id, ...rest } = args;
      const patch: Record<string, unknown> = {};
      if (rest.title !== undefined) patch.title = rest.title;
      if (rest.description !== undefined) patch.description = rest.description;
      if (rest.status !== undefined) patch.status = rest.status;

      return mcpWriteTool(sb, "update_goal", args as Record<string, unknown>, async () => {
        if (Object.keys(patch).length === 0) {
          throw new Error("No fields to update");
        }
        const { data, error } = await sb
          .from("admin_goals")
          .update(patch)
          .eq("id", goal_id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);

        const { data: objectives } = await sb
          .from("admin_objectives")
          .select("id")
          .eq("goal_id", goal_id)
          .is("deleted_at", null);

        return {
          ...data,
          objective_count: (objectives ?? []).length,
        };
      });
    },
  );

  server.registerTool(
    "delete_goal",
    {
      description:
        "Ta bort ett goal (mjuk radering). Objectives under det kopplas loss (goal_id sätts till null).",
      inputSchema: {
        goal_id: z.string(),
      },
    },
    async (args) => {
      return mcpWriteTool(sb, "delete_goal", args as Record<string, unknown>, async () => {
        const { goal_id } = args;
        await sb.from("admin_objectives").update({ goal_id: null }).eq("goal_id", goal_id);
        const { error } = await sb
          .from("admin_goals")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", goal_id);
        if (error) throw new Error(error.message);
        return { ok: true, goal_id };
      });
    },
  );
}
