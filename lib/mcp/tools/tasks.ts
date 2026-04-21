import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getMcpActorProfileId } from "../utils/actor";
import { mcpJsonResult, mcpErrorResult } from "../utils/tool-result";
import {
  MCP_ADMIN_TASK_SELECT_DETAIL,
  MCP_ADMIN_TASK_SELECT_LIST,
} from "../utils/mcp-admin-task-select";
import {
  assertValidSubtaskParent,
  assertValidTaskParentUpdate,
} from "../utils/task-parent";
import { mcpWriteTool } from "../utils/write-tool";

const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

/** Default page size; capped by LIST_TASKS_MAX_LIMIT. */
const LIST_TASKS_DEFAULT_LIMIT = 100;
const LIST_TASKS_MAX_LIMIT = 500;

export function registerTaskTools(server: McpServer, sb: SupabaseClient) {
  server.registerTool(
    "list_tasks",
    {
      description:
        "Lista tasks (toppnivå om inget parent_task_id). Paginerat: default limit 100, max 500; använd offset + has_more.",
      inputSchema: {
        project_id: z.string().optional(),
        objective_id: z.string().optional(),
        parent_task_id: z
          .string()
          .optional()
          .describe("Filter: delsteg under denna parent."),
        include_subtasks: z
          .boolean()
          .optional()
          .describe("true = flat lista inkl. delsteg."),
        status: z.string().optional(),
        limit: z
          .number()
          .int()
          .positive()
          .max(LIST_TASKS_MAX_LIMIT)
          .optional()
          .describe(`Antal rader (default ${LIST_TASKS_DEFAULT_LIMIT}, max ${LIST_TASKS_MAX_LIMIT}).`),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Radoffset för nästa sida (default 0)."),
      },
    },
    async ({
      project_id,
      objective_id,
      parent_task_id,
      include_subtasks,
      status,
      limit: limitArg,
      offset: offsetArg,
    }) => {
      try {
        const effectiveLimit = Math.min(
          Math.max(1, limitArg ?? LIST_TASKS_DEFAULT_LIMIT),
          LIST_TASKS_MAX_LIMIT,
        );
        const offset = Math.max(0, offsetArg ?? 0);
        const fetchSize = effectiveLimit + 1;

        let q = sb
          .from("admin_tasks")
          .select(MCP_ADMIN_TASK_SELECT_LIST)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (project_id) q = q.eq("project_id", project_id);
        if (objective_id) q = q.eq("objective_id", objective_id);
        if (parent_task_id) q = q.eq("parent_task_id", parent_task_id);
        else if (!include_subtasks) q = q.is("parent_task_id", null);
        if (status) q = q.eq("status", status);

        const to = offset + fetchSize - 1;
        const { data: raw, error } = await q.range(offset, to);
        if (error) return mcpErrorResult(error.message, "list_tasks");
        const rows = raw ?? [];
        const has_more = rows.length > effectiveLimit;
        const tasks = has_more ? rows.slice(0, effectiveLimit) : rows;

        return mcpJsonResult(
          {
            tasks,
            limit: effectiveLimit,
            offset,
            has_more,
          },
          { tool: "list_tasks", rowCount: tasks.length },
        );
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_tasks",
        );
      }
    },
  );

  server.registerTool(
    "get_task",
    {
      description:
        "En task by id (inkl. description). Preferera framför list_tasks när du redan har UUID.",
      inputSchema: {
        task_id: z.string().describe("UUID för admin_tasks"),
      },
    },
    async ({ task_id }) => {
      try {
        const { data, error } = await sb
          .from("admin_tasks")
          .select(MCP_ADMIN_TASK_SELECT_DETAIL)
          .eq("id", task_id)
          .is("deleted_at", null)
          .maybeSingle();
        if (error) return mcpErrorResult(error.message, "get_task");
        if (!data) return mcpErrorResult("Task not found", "get_task");
        return mcpJsonResult(data, { tool: "get_task", rowCount: 1 });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_task",
        );
      }
    },
  );

  server.registerTool(
    "create_task",
    {
      description:
        "Skapa task. Valfri parent_task_id = delsteg; project/objective ärvs från parent om utelämnat.",
      inputSchema: {
        title: z.string(),
        description: z.string().optional(),
        project_id: z.string().optional(),
        objective_id: z.string().optional(),
        parent_task_id: z.string().optional().describe("Parent UUID (toppnivå-task) för delsteg."),
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
            .select(MCP_ADMIN_TASK_SELECT_LIST)
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
        "Patcha en task (fält du skickar). parent_task_id = ny parent eller null = lossa. Max en delstegsnivå.",
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
          .describe("Parent UUID eller null."),
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
            .select(MCP_ADMIN_TASK_SELECT_LIST)
            .single();
          if (error) throw new Error(error.message);
          return data;
        },
      );
    },
  );

  const batchSortItemSchema = z
    .object({
      task_id: z.string(),
      sort_order: z.number().int().optional(),
      status_sort_order: z.number().int().optional(),
    })
    .refine(
      (row) =>
        row.sort_order !== undefined || row.status_sort_order !== undefined,
      { message: "Each item needs sort_order and/or status_sort_order" },
    );

  server.registerTool(
    "batch_update_task_sort",
    {
      description:
        "Uppdatera sort_order/status_sort_order för flera tasks i ett anrop. Svar: ok + updated_task_ids.",
      inputSchema: {
        items: z.array(batchSortItemSchema).min(1).max(200),
      },
    },
    async (args) => {
      const { items } = args;
      return mcpWriteTool(
        sb,
        "batch_update_task_sort",
        args as Record<string, unknown>,
        async () => {
          const ids = items.map((i) => i.task_id);
          const unique = new Set(ids);
          if (unique.size !== ids.length) {
            throw new Error("Duplicate task_id in items");
          }
          const { data: found, error: findErr } = await sb
            .from("admin_tasks")
            .select("id")
            .in("id", ids)
            .is("deleted_at", null);
          if (findErr) throw new Error(findErr.message);
          const foundSet = new Set((found ?? []).map((r) => r.id as string));
          const missing = ids.filter((id) => !foundSet.has(id));
          if (missing.length > 0) {
            const sample = missing.slice(0, 5).join(", ");
            throw new Error(
              `Unknown or deleted task(s): ${sample}${missing.length > 5 ? "…" : ""}`,
            );
          }
          for (const it of items) {
            const patch: Record<string, unknown> = {};
            if (it.sort_order !== undefined) patch.sort_order = it.sort_order;
            if (it.status_sort_order !== undefined) {
              patch.status_sort_order = it.status_sort_order;
            }
            const { error: upErr } = await sb
              .from("admin_tasks")
              .update(patch)
              .eq("id", it.task_id)
              .is("deleted_at", null);
            if (upErr) throw new Error(upErr.message);
          }
          return { ok: true as const, updated_task_ids: ids };
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
    parent_task_id: z.string().optional().describe("Override parent UUID."),
  });

  server.registerTool(
    "batch_create_tasks",
    {
      description:
        "Skapa flera tasks. Batch-parent_task_id + per-rad override; project/objective ärvs från parent vid behov.",
      inputSchema: {
        project_id: z.string().optional(),
        objective_id: z.string().optional(),
        parent_task_id: z.string().optional().describe("Default parent UUID för alla rader."),
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
            .select(MCP_ADMIN_TASK_SELECT_LIST);
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
        "Delsteg under parent_task_id (samma som create_task+parent).",
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
            .select(MCP_ADMIN_TASK_SELECT_LIST)
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
        "Sätt task/delsteg till done/todo; trigger kan uppdatera parent när alla delsteg är klara.",
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
            .select(MCP_ADMIN_TASK_SELECT_LIST)
            .single();
          if (error) throw new Error(error.message);
          return data;
        },
      );
    },
  );
}
