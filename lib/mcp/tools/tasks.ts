import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getMcpActorProfileId } from "../utils/actor";
import { mcpJsonResult, mcpErrorResult } from "../utils/tool-result";
import {
  assertValidSubtaskParent,
  assertValidTaskParentUpdate,
} from "../utils/task-parent";
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
      description:
        "Skapa en ny task kopplad till projekt och/eller objective. Använd valfri parent_task_id (UUID) för att skapa ett delsteg/subtask under en befintlig toppnivå-task; project_id och objective_id ärvs då från föräldern om de utelämnas.",
      inputSchema: {
        title: z.string(),
        description: z.string().optional(),
        project_id: z.string().optional(),
        objective_id: z.string().optional(),
        parent_task_id: z
          .string()
          .optional()
          .describe(
            "UUID för parent task. Skapar denna task som delsteg under en befintlig (toppnivå-)task.",
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

          if (parent_task_id) {
            const parent = await assertValidSubtaskParent(sb, parent_task_id);
            if (project_id === undefined) {
              proj = parent.project_id;
            }
            if (objective_id === undefined) {
              obj = parent.objective_id;
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
        "Uppdatera en task eller delsteg (titel, status, prioritet, kopplingar). Sätt parent_task_id till en annan tasks UUID för att göra denna task till delsteg under den parenten, eller sätt till null för att frikoppla från förälder. Endast en nivå delsteg (parent måste vara toppnivå-task).",
      inputSchema: {
        task_id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        project_id: z.string().nullable().optional(),
        objective_id: z.string().nullable().optional(),
        parent_task_id: z
          .string()
          .nullable()
          .optional()
          .describe(
            "Ny förälder (toppnivå-task) eller null för att ta bort delsteg-koppling.",
          ),
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
          if (rest.parent_task_id !== undefined) {
            await assertValidTaskParentUpdate(
              sb,
              task_id,
              rest.parent_task_id,
            );
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
          const { error: detachErr } = await sb
            .from("admin_tasks")
            .update({ parent_task_id: null })
            .eq("parent_task_id", task_id)
            .is("deleted_at", null);
          if (detachErr) throw new Error(detachErr.message);
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
    priority: taskPrioritySchema.optional(),
    parent_task_id: z
      .string()
      .optional()
      .describe("Override: delsteg under denna parent-task (toppnivå)."),
  });

  server.registerTool(
    "batch_create_tasks",
    {
      description:
        "Skapa flera tasks på en gång. Valfri parent_task_id på batch-nivå blir standard förälder för alla rader; varje objekt i tasks kan sätta egen parent_task_id som override. project_id/objective_id ärvs från parent när de utelämnas. Subtasks stöds (en nivå).",
      inputSchema: {
        project_id: z.string().optional(),
        objective_id: z.string().optional(),
        parent_task_id: z
          .string()
          .optional()
          .describe("Standard-parent (UUID) för alla tasks i listan om inte override per rad."),
        tasks: z.array(batchTaskItemSchema).min(1),
      },
    },
    async (args) => {
      const { project_id, objective_id, parent_task_id: batchParentId, tasks } =
        args;
      return mcpWriteTool(
        sb,
        "batch_create_tasks",
        args as Record<string, unknown>,
        async () => {
          const actor = await getMcpActorProfileId(sb);
          const parentCache = new Map<string, Awaited<
            ReturnType<typeof assertValidSubtaskParent>
          >>();

          async function parentFor(effParentId: string) {
            const cached = parentCache.get(effParentId);
            if (cached) return cached;
            const p = await assertValidSubtaskParent(sb, effParentId);
            parentCache.set(effParentId, p);
            return p;
          }

          const rows = await Promise.all(
            tasks.map(async (t) => {
              const effParent =
                t.parent_task_id ?? batchParentId ?? undefined;
              let proj: string | null | undefined =
                project_id !== undefined ? project_id : undefined;
              let obj: string | null | undefined =
                objective_id !== undefined ? objective_id : undefined;

              if (effParent) {
                const parent = await parentFor(effParent);
                if (project_id === undefined) proj = parent.project_id;
                if (objective_id === undefined) obj = parent.objective_id;
              }

              return {
                title: t.title,
                description: t.description ?? null,
                project_id: proj ?? null,
                objective_id: obj ?? null,
                parent_task_id: effParent ?? null,
                status: t.status ?? "todo",
                priority: t.priority ?? "medium",
                created_by: actor,
              };
            }),
          );
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
          const parent = await assertValidSubtaskParent(sb, parent_task_id);
          const { data, error } = await sb
            .from("admin_tasks")
            .insert({
              title,
              description: description ?? null,
              parent_task_id,
              project_id: parent.project_id,
              objective_id: parent.objective_id,
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
