/* eslint-disable no-console */

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local")
  const txt = fs.readFileSync(envPath, "utf8")
  for (const line of txt.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let v = m[2]
    if (v.startsWith("\"") && v.endsWith("\"")) v = v.slice(1, -1)
    process.env[m[1]] = v
  }
}

async function main() {
  const id = process.argv[2]
  if (!id) {
    console.error("Usage: pnpm exec tsx scripts/debug-get-task.ts <taskId>")
    process.exit(2)
  }

  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Missing env", { hasUrl: !!url, hasKey: !!key })
    process.exit(2)
  }

  const sb = createClient(url, key)

  const ADMIN_TASK_SELECT = `*,
  project:admin_projects(id, name),
  objective:admin_objectives(id, title),
  assignee:profiles!admin_tasks_assigned_to_fkey(id, email),
  creator:profiles!admin_tasks_created_by_fkey(id, email)`

  const sel = `
    ${ADMIN_TASK_SELECT},
    comments:admin_task_comments(*, author:profiles!admin_task_comments_author_id_fkey(id, email)),
    activity:admin_task_activity(*, actor:profiles!admin_task_activity_actor_id_fkey(id, email)),
    entity_links:admin_entity_links(*),
    subtasks:admin_tasks!parent_task_id(${ADMIN_TASK_SELECT})
  `

  const base = await sb
    .from("admin_tasks")
    .select("id,title,deleted_at,created_at,created_by")
    .eq("id", id)
    .maybeSingle()

  const full = await sb
    .from("admin_tasks")
    .select(sel)
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  console.log(
    JSON.stringify(
      {
        base: {
          hasRow: !!base.data,
          error: base.error?.message ?? null,
          created_by: (base.data as any)?.created_by ?? null,
          deleted_at: (base.data as any)?.deleted_at ?? null,
        },
        full: {
          hasRow: !!full.data,
          error: full.error?.message ?? null,
          code: (full.error as any)?.code ?? null,
          details: (full.error as any)?.details ?? null,
          hint: (full.error as any)?.hint ?? null,
        },
      },
      null,
      2
    )
  )
}

main().catch((e) => {
  console.error("debug-get-task failed", e?.message ?? e)
  process.exit(1)
})

