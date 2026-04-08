import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getMcpActorProfileId } from "../utils/actor";
import { mcpJsonResult, mcpErrorResult } from "../utils/tool-result";
import { mcpWriteTool } from "../utils/write-tool";

const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export function registerTaskTools(server: McpServer, sb: SupabaseClient) {
  server.registerTool(
    "list_tasks",
    {
      description:
        "Lista tasks. Kan filtreras på project_id, objective_id och/eller status.",
      inputSchema: {
        project_id: z.string().optional(),
        objective_id: z.string().optional(),
        status: z.string().optional(),
      },
    },
    async ({ project_id, objective_id, status }) => {
      try {
        let q = sb
          .from("admin_tasks")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (project_id) q = q.eq("project_id", project_id);
        if (objective_id) q = q.eq("objective_id", objective_id);
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
    "create_task",
    {
      description: "Skapa en ny task, kopplad till projekt och/eller objective.",
      inputSchema: {
        title: z.string(),
        description: z.string().optional(),
        project_id: z.string().optional(),
        objective_id: z.string().optional(),
        status: z.string().optional().default("todo"),
        priority: taskPrioritySchema.optional(),
      },
    },
    async (args) => {
      const {
        title,
        description,
        project_id,
        objective_id,
        status = "todo",
        priority,
      } = args;
      return mcpWriteTool(
        sb,
        "create_task",
        args as Record<string, unknown>,
        async () => {
          const actor = await getMcpActorProfileId(sb);
          const { data, error } = await sb
            .from("admin_tasks")
            .insert({
              title,
              description: description ?? null,
              project_id: project_id ?? null,
              objective_id: objective_id ?? null,
              status,
              priority: priority ?? "medium",
              created_by: actor,
            })
            .select("*")
            .single();
          if (error) throw new Error(error.message);
          return data;
        },
      );
    },
  );

  server.registerTool(
    "update_task",
    {
      description:
        "Uppdatera en task (titel, status, prioritet, kopplingar).",
      inputSchema: {
        task_id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        project_id: z.string().nullable().optional(),
        objective_id: z.string().nullable().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
      },
    },
    async (args) => {
      const { task_id, ...rest } = args;
      const patch: Record<string, unknown> = {};
      if (rest.title !== undefined) patch.title = rest.title;
      if (rest.description !== undefined) patch.description = rest.description;
      if (rest.project_id !== undefined) patch.project_id = rest.project_id;
      if (rest.objective_id !== undefined) patch.objective_id = rest.objective_id;
      if (rest.status !== undefined) {
        patch.status = rest.status;
        if (rest.status === "done") {
          patch.completed_at = new Date().toISOString();
        } else {
          patch.completed_at = null;
        }
      }
      if (rest.priority !== undefined) patch.priority = rest.priority;

      return mcpWriteTool(
        sb,
        "update_task",
        args as Record<string, unknown>,
        async () => {
          if (Object.keys(patch).length === 0) {
            throw new Error("No fields to update");
          }
          const { data, error } = await sb
            .from("admin_tasks")
            .update(patch)
            .eq("id", task_id)
            .select("*")
            .single();
          if (error) throw new Error(error.message);
          return data;
        },
      );
    },
  );

  server.registerTool(
    "delete_task",
    {
      description: "Ta bort en task (mjuk radering).",
      inputSchema: {
        task_id: z.string(),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "delete_task",
        args as Record<string, unknown>,
        async () => {
          const { task_id } = args;
          const { error } = await sb
            .from("admin_tasks")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", task_id);
          if (error) throw new Error(error.message);
          return { ok: true, task_id };
        },
      );
    },
  );

  const batchTaskItemSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    status: z.string().optional().default("todo"),
    priority: z.string().optional(),
  });

  server.registerTool(
    "batch_create_tasks",
    {
      description: "Skapa flera tasks på en gång under samma projekt.",
      inputSchema: {
        project_id: z.string().optional(),
        objective_id: z.string().optional(),
        tasks: z.array(batchTaskItemSchema).min(1),
      },
    },
    async (args) => {
      const { project_id, objective_id, tasks } = args;
      return mcpWriteTool(
        sb,
        "batch_create_tasks",
        args as Record<string, unknown>,
        async () => {
          const actor = await getMcpActorProfileId(sb);
          const rows = tasks.map((t) => ({
            title: t.title,
            description: t.description ?? null,
            project_id: project_id ?? null,
            objective_id: objective_id ?? null,
            status: t.status ?? "todo",
            priority: (t.priority as string | undefined) ?? "medium",
            created_by: actor,
          }));
          const { data, error } = await sb
            .from("admin_tasks")
            .insert(rows)
            .select("*");
          if (error) throw new Error(error.message);
          return { created: data ?? [] };
        },
      );
    },
  );
}
