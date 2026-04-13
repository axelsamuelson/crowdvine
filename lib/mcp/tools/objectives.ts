import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getMcpActorProfileId } from "../utils/actor";
import { nestAdminTasksWithSubtasks } from "../utils/nest-admin-tasks";
import { mcpJsonResult, mcpErrorResult } from "../utils/tool-result";
import { mcpWriteTool } from "../utils/write-tool";

const DEFAULT_OBJECTIVE_PERIOD = "H2 2026";

export function registerObjectiveTools(server: McpServer, sb: SupabaseClient) {
  server.registerTool(
    "list_objectives",
    {
      description:
        "Lista alla objectives. Kan filtreras på goal_id och/eller status.",
      inputSchema: {
        goal_id: z
          .string()
          .optional()
          .describe("Filtrera på goal. Utelämna för alla."),
        status: z.string().optional().describe("Filtrera på status."),
      },
    },
    async ({ goal_id, status }) => {
      try {
        let q = sb
          .from("admin_objectives")
          .select(
            `
            *,
            key_results:admin_key_results(*),
            goal:admin_goals(id, title)
          `,
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (goal_id) q = q.eq("goal_id", goal_id);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return mcpErrorResult(error.message);
        return mcpJsonResult(data ?? []);
      } catch (e) {
        return mcpErrorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "get_objective",
    {
      description:
        "Hämta ett specifikt objective med kopplade projects, metrics och tasks som träd (toppnivå med `subtasks` för delsteg).",
      inputSchema: {
        objective_id: z.string(),
      },
    },
    async ({ objective_id }) => {
      try {
        const { data: objective, error: oErr } = await sb
          .from("admin_objectives")
          .select(
            `
            *,
            key_results:admin_key_results(*),
            goal:admin_goals(id, title)
          `,
          )
          .eq("id", objective_id)
          .is("deleted_at", null)
          .single();

        if (oErr) return mcpErrorResult(oErr.message);

        const { data: projects, error: pErr } = await sb
          .from("admin_projects")
          .select("*")
          .eq("objective_id", objective_id)
          .is("deleted_at", null);

        if (pErr) return mcpErrorResult(pErr.message);

        const { data: tasks, error: tErr } = await sb
          .from("admin_tasks")
          .select("*")
          .eq("objective_id", objective_id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (tErr) return mcpErrorResult(tErr.message);

        const { data: metrics, error: mErr } = await sb
          .from("admin_objective_metrics")
          .select("*")
          .eq("objective_id", objective_id);

        if (mErr) return mcpErrorResult(mErr.message);

        return mcpJsonResult({
          ...objective,
          projects: (projects ?? []).map((p) => ({
            ...p,
            title: p.name,
          })),
          tasks: nestAdminTasksWithSubtasks(tasks ?? []),
          metrics: metrics ?? [],
        });
      } catch (e) {
        return mcpErrorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "create_objective",
    {
      description: "Skapa ett nytt objective, valfritt kopplat till ett goal.",
      inputSchema: {
        title: z.string(),
        description: z.string().optional(),
        goal_id: z
          .string()
          .optional()
          .describe("UUID för parent goal (valfritt)"),
        status: z.string().optional().default("active"),
        period: z
          .string()
          .optional()
          .describe(
            `Period (krävs internt i DB; default ${DEFAULT_OBJECTIVE_PERIOD})`,
          ),
      },
    },
    async (args) => {
      const { title, description, goal_id, status = "active", period } = args;
      return mcpWriteTool(
        sb,
        "create_objective",
        args as Record<string, unknown>,
        async () => {
          const actor = await getMcpActorProfileId(sb);
          const { data, error } = await sb
            .from("admin_objectives")
            .insert({
              title,
              description: description ?? null,
              goal_id: goal_id ?? null,
              status,
              period: period ?? DEFAULT_OBJECTIVE_PERIOD,
              created_by: actor,
            })
            .select(
              `
              *,
              key_results:admin_key_results(*),
              goal:admin_goals(id, title)
            `,
            )
            .single();
          if (error) throw new Error(error.message);
          return data;
        },
      );
    },
  );

  server.registerTool(
    "update_objective",
    {
      description: "Uppdatera ett objective.",
      inputSchema: {
        objective_id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        goal_id: z.string().nullable().optional(),
        status: z.string().optional(),
        period: z.string().optional(),
      },
    },
    async (args) => {
      const { objective_id, ...rest } = args;
      const patch: Record<string, unknown> = {};
      if (rest.title !== undefined) patch.title = rest.title;
      if (rest.description !== undefined) patch.description = rest.description;
      if (rest.goal_id !== undefined) patch.goal_id = rest.goal_id;
      if (rest.status !== undefined) patch.status = rest.status;
      if (rest.period !== undefined) patch.period = rest.period;

      return mcpWriteTool(
        sb,
        "update_objective",
        args as Record<string, unknown>,
        async () => {
          if (Object.keys(patch).length === 0) {
            throw new Error("No fields to update");
          }
          const { data, error } = await sb
            .from("admin_objectives")
            .update(patch)
            .eq("id", objective_id)
            .select(
              `
              *,
              key_results:admin_key_results(*),
              goal:admin_goals(id, title)
            `,
            )
            .single();
          if (error) throw new Error(error.message);
          return data;
        },
      );
    },
  );

  server.registerTool(
    "delete_objective",
    {
      description:
        "Ta bort ett objective (mjuk radering) och dess aktiva kopplingar i operations-vyn.",
      inputSchema: {
        objective_id: z.string(),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "delete_objective",
        args as Record<string, unknown>,
        async () => {
          const { objective_id } = args;
          const { error } = await sb
            .from("admin_objectives")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", objective_id);
          if (error) throw new Error(error.message);
          return { ok: true, objective_id };
        },
      );
    },
  );
}
