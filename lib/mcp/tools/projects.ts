import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getMcpActorProfileId } from "../utils/actor";
import { nestAdminTasksWithSubtasks } from "../utils/nest-admin-tasks";
import { mcpJsonResult, mcpErrorResult } from "../utils/tool-result";
import { mcpWriteTool } from "../utils/write-tool";

function withProjectTitle<T extends { name: string }>(row: T) {
  return { ...row, title: row.name };
}

export function registerProjectTools(server: McpServer, sb: SupabaseClient) {
  server.registerTool(
    "list_projects",
    {
      description:
        "Lista alla projects. Kan filtreras på objective_id och/eller status.",
      inputSchema: {
        objective_id: z.string().optional(),
        status: z.string().optional(),
      },
    },
    async ({ objective_id, status }) => {
      try {
        let q = sb
          .from("admin_projects")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (objective_id) q = q.eq("objective_id", objective_id);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return mcpErrorResult(error.message);
        return mcpJsonResult((data ?? []).map((p) => withProjectTitle(p)));
      } catch (e) {
        return mcpErrorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "get_project",
    {
      description:
        "Hämta ett projekt med tasks som träd: toppnivåtasks med `subtasks`-array (delsteg), sorterade nyast först.",
      inputSchema: {
        project_id: z.string(),
      },
    },
    async ({ project_id }) => {
      try {
        const { data: project, error: pErr } = await sb
          .from("admin_projects")
          .select("*")
          .eq("id", project_id)
          .is("deleted_at", null)
          .single();

        if (pErr) return mcpErrorResult(pErr.message);

        const { data: tasks, error: tErr } = await sb
          .from("admin_tasks")
          .select("*")
          .eq("project_id", project_id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (tErr) return mcpErrorResult(tErr.message);

        return mcpJsonResult({
          ...withProjectTitle(project),
          tasks: nestAdminTasksWithSubtasks(tasks ?? []),
        });
      } catch (e) {
        return mcpErrorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "create_project",
    {
      description:
        "Skapa ett nytt projekt, valfritt kopplat till objective och/eller key result.",
      inputSchema: {
        title: z.string(),
        description: z.string().optional(),
        objective_id: z.string().optional(),
        key_result_id: z.string().optional(),
        status: z.string().optional().default("active"),
      },
    },
    async (args) => {
      const {
        title,
        description,
        objective_id,
        key_result_id,
        status = "active",
      } = args;
      return mcpWriteTool(
        sb,
        "create_project",
        args as Record<string, unknown>,
        async () => {
          const actor = await getMcpActorProfileId(sb);
          const { data, error } = await sb
            .from("admin_projects")
            .insert({
              name: title,
              description: description ?? null,
              objective_id: objective_id ?? null,
              key_result_id: key_result_id ?? null,
              status,
              created_by: actor,
            })
            .select("*")
            .single();
          if (error) throw new Error(error.message);
          return withProjectTitle(data);
        },
      );
    },
  );

  server.registerTool(
    "update_project",
    {
      description: "Uppdatera ett projekt.",
      inputSchema: {
        project_id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        objective_id: z.string().nullable().optional(),
        key_result_id: z.string().nullable().optional(),
        status: z.string().optional(),
      },
    },
    async (args) => {
      const { project_id, title, ...rest } = args;
      const patch: Record<string, unknown> = {};
      if (title !== undefined) patch.name = title;
      if (rest.description !== undefined) patch.description = rest.description;
      if (rest.objective_id !== undefined) patch.objective_id = rest.objective_id;
      if (rest.key_result_id !== undefined)
        patch.key_result_id = rest.key_result_id;
      if (rest.status !== undefined) patch.status = rest.status;

      return mcpWriteTool(
        sb,
        "update_project",
        args as Record<string, unknown>,
        async () => {
          if (Object.keys(patch).length === 0) {
            throw new Error("No fields to update");
          }
          const { data, error } = await sb
            .from("admin_projects")
            .update(patch)
            .eq("id", project_id)
            .select("*")
            .single();
          if (error) throw new Error(error.message);
          return withProjectTitle(data);
        },
      );
    },
  );

  server.registerTool(
    "delete_project",
    {
      description: "Ta bort ett projekt (mjuk radering).",
      inputSchema: {
        project_id: z.string(),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "delete_project",
        args as Record<string, unknown>,
        async () => {
          const { project_id } = args;
          const { error } = await sb
            .from("admin_projects")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", project_id);
          if (error) throw new Error(error.message);
          return { ok: true, project_id };
        },
      );
    },
  );
}
