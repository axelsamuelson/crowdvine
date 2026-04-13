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
        "Lista tasks. Som standard endast toppnivåtasks (inga delsteg); sätt parent_task_id för delsteg under en task, eller include_subtasks för allt.",
      inputSchema: {
        project_id: z.string().optional(),
        objective_id: z.string().optional(),
        parent_task_id: z
          .string()
          .optional()
          .describe("Endast tasks vars parent_task_id matchar (delsteg under en task)."),
        include_subtasks: z
          .boolean()
          .optional()
          .describe("Om true, inkludera även rader med parent_task_id (flat lista)."),
        status: z.string().optional(),
      },
    },
    async ({ project_id, objective_id, parent_task_id, include_subtasks, status }) => {
      try {
        let q = sb
          .from("admin_tasks")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (project_id) q = q.eq("project_id", project_id);
        if (objective_id) q = q.eq("objective_id", objective_id);
        if (parent_task_id) q = q.eq("parent_task_id", parent_task_id);
        else if (!include_subtasks) q = q.is("parent_task_id", null);
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
        parent_task_id: z
          .string()
          .optional()
          .describe(
            "Om satt skapas ett delsteg; project_id/objective_id ärvs från föräldern om de utelämnas.",
          ),
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
        parent_task_id,
        status = "todo",
        priority,
      } = args;
      return mcpWriteTool(
        sb,
        "create_task",
        args as Record<string, unknown>,
        async () => {
          const actor = await getMcpActorProfileId(sb);
          let proj: string | null | undefined = project_id;
          let obj: string | null | undefined = objective_id;
          if (
            parent_task_id &&
            (project_id === undefined || objective_id === undefined)
          ) {
            const { data: parent } = await sb
              .from("admin_tasks")
              .select("project_id, objective_id")
              .eq("id", parent_task_id)
              .is("deleted_at", null)
              .maybeSingle();
            if (parent) {
              if (project_id === undefined) {
                proj = (parent.project_id as string | null) ?? null;
              }
              if (objective_id === undefined) {
                obj = (parent.objective_id as string | null) ?? null;
              }
            }
          }

          const { data, error } = await sb
            .from("admin_tasks")
            .insert({
              title,
              description: description ?? null,
              project_id: proj ?? null,
              objective_id: obj ?? null,
              parent_task_id: parent_task_id ?? null,
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
        "Uppdatera en task eller ett delsteg (titel, status, prioritet, kopplingar, parent_task_id).",
      inputSchema: {
        task_id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        project_id: z.string().nullable().optional(),
        objective_id: z.string().nullable().optional(),
        parent_task_id: z.string().nullable().optional(),
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
      if (rest.parent_task_id !== undefined) {
        patch.parent_task_id = rest.parent_task_id;
      }
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

  server.registerTool(
    "create_subtask",
    {
      description:
        "Skapa ett delsteg under en befintlig task (checklista). Ärver project/objective från föräldern om de inte anges.",
      inputSchema: {
        parent_task_id: z.string(),
        title: z.string(),
        description: z.string().optional(),
      },
    },
    async (args) => {
      const { parent_task_id, title, description } = args;
      return mcpWriteTool(
        sb,
        "create_subtask",
        args as Record<string, unknown>,
        async () => {
          const actor = await getMcpActorProfileId(sb);
          const { data: parent } = await sb
            .from("admin_tasks")
            .select("project_id, objective_id")
            .eq("id", parent_task_id)
            .is("deleted_at", null)
            .maybeSingle();
          const { data, error } = await sb
            .from("admin_tasks")
            .insert({
              title,
              description: description ?? null,
              parent_task_id,
              project_id: (parent?.project_id as string | null) ?? null,
              objective_id: (parent?.objective_id as string | null) ?? null,
              status: "todo",
              priority: "medium",
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
    "set_subtask_done",
    {
      description:
        "Sätt ett delsteg (eller valfri task) till klart (done) eller ångra (todo). När alla delsteg under samma förälder är done uppdateras föräldern automatiskt till done (databastrigger).",
      inputSchema: {
        subtask_id: z.string(),
        done: z.boolean(),
      },
    },
    async (args) => {
      const { subtask_id, done } = args;
      return mcpWriteTool(
        sb,
        "set_subtask_done",
        args as Record<string, unknown>,
        async () => {
          const status = done ? "done" : "todo";
          const patch = {
            status,
            completed_at: done ? new Date().toISOString() : null,
          };
          const { data, error } = await sb
            .from("admin_tasks")
            .update(patch)
            .eq("id", subtask_id)
            .select("*")
            .single();
          if (error) throw new Error(error.message);
          return data;
        },
      );
    },
  );
}
