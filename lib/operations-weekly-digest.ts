import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getAppUrl } from "@/lib/app-url"
import { sendGridService } from "@/lib/sendgrid-service"

const DIGEST_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ACTIVITY = 120
const MAX_COMMENTS = 40
const MAX_NEW_TASKS = 25
const MAX_NEW_PROJECTS = 20

export type WeeklyDigestSettings = {
  enabled: boolean
  last_sent_at: string | null
  updated_at: string | null
}

export function isStockholmSundayNoonWindow(d: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Stockholm",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d)
  const m = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  ) as { weekday?: string; hour?: string; minute?: string }
  if (m.weekday !== "Sun") return false
  const h = parseInt(m.hour ?? "-1", 10)
  const min = parseInt(m.minute ?? "-1", 10)
  if (Number.isNaN(h) || Number.isNaN(min)) return false
  return h === 12 && min < 15
}

export function wasSentRecently(
  lastSentAt: string | null,
  minIntervalMs: number
): boolean {
  if (!lastSentAt) return false
  const t = new Date(lastSentAt).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < minIntervalMs
}

export async function getWeeklyDigestSettings(): Promise<WeeklyDigestSettings> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("admin_operations_weekly_digest_settings")
    .select("enabled, last_sent_at, updated_at")
    .eq("id", "default")
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    return { enabled: false, last_sent_at: null, updated_at: null }
  }
  return {
    enabled: Boolean(data.enabled),
    last_sent_at: (data.last_sent_at as string) ?? null,
    updated_at: (data.updated_at as string) ?? null,
  }
}

export async function setWeeklyDigestEnabled(enabled: boolean): Promise<void> {
  const sb = getSupabaseAdmin()
  const { error } = await sb.from("admin_operations_weekly_digest_settings").upsert(
    {
      id: "default",
      enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  )
  if (error) throw new Error(error.message)
}

export async function markWeeklyDigestSent(): Promise<void> {
  const sb = getSupabaseAdmin()
  const { error } = await sb
    .from("admin_operations_weekly_digest_settings")
    .update({
      last_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default")
  if (error) throw new Error(error.message)
}

function actionLabel(actionType: string): string {
  const map: Record<string, string> = {
    status_changed: "Status changed",
    assignee_changed: "Assignee changed",
    assignees_updated: "Assignees updated",
    due_date_changed: "Due date changed",
    priority_changed: "Priority changed",
    linked_to_project: "Project link",
    linked_to_objective: "Objective link",
    comment_added: "Comment activity",
    created: "Task created",
  }
  return map[actionType] ?? actionType.replace(/_/g, " ")
}

function formatChange(
  actionType: string,
  oldV: string | null,
  newV: string | null
): string {
  if (oldV == null && newV == null) return ""
  if (oldV == null) return ` → ${newV}`
  if (newV == null) return ` (was ${oldV})`
  return ` ${oldV} → ${newV}`
}

export type DigestPayload = {
  periodLabel: string
  sinceIso: string
  activityLines: string[]
  commentLines: string[]
  newTaskLines: string[]
  newProjectLines: string[]
}

export async function buildOperationsDigestPayload(
  since: Date
): Promise<DigestPayload> {
  const sb = getSupabaseAdmin()
  const sinceIso = since.toISOString()

  const periodEnd = new Date()
  const periodLabel = `${since.toLocaleDateString("sv-SE")} – ${periodEnd.toLocaleDateString("sv-SE")}`

  const { data: activityRows, error: actErr } = await sb
    .from("admin_task_activity")
    .select(
      `
      id,
      action_type,
      old_value,
      new_value,
      created_at,
      task:admin_tasks(title, deleted_at),
      actor:profiles(email)
    `
    )
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(MAX_ACTIVITY * 2)

  if (actErr) throw new Error(actErr.message)

  const activityLines: string[] = []
  for (const row of activityRows ?? []) {
    const task = row.task as { title?: string; deleted_at?: string | null } | null
    if (!task || task.deleted_at != null) continue
    const actor = row.actor as { email?: string } | null
    const title = task?.title ?? "Task"
    const who = actor?.email?.split("@")[0] ?? actor?.email ?? "Someone"
    const line = `${row.created_at?.toString().slice(0, 16).replace("T", " ")} — ${who} — ${title}: ${actionLabel(row.action_type as string)}${formatChange(row.action_type as string, row.old_value as string | null, row.new_value as string | null)}`
    activityLines.push(line)
    if (activityLines.length >= MAX_ACTIVITY) break
  }

  const { data: commentRows, error: comErr } = await sb
    .from("admin_task_comments")
    .select(
      `
      body,
      created_at,
      task:admin_tasks(title, deleted_at),
      author:profiles(email)
    `
    )
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(MAX_COMMENTS * 2)

  if (comErr) throw new Error(comErr.message)

  const commentLines: string[] = []
  for (const row of commentRows ?? []) {
    const task = row.task as { title?: string; deleted_at?: string | null } | null
    if (!task || task.deleted_at != null) continue
    const author = row.author as { email?: string } | null
    const snippet = ((row.body as string) ?? "").replace(/\s+/g, " ").trim()
    const short =
      snippet.length > 120 ? `${snippet.slice(0, 117)}…` : snippet
    const who = author?.email?.split("@")[0] ?? author?.email ?? "Someone"
    commentLines.push(
      `${row.created_at?.toString().slice(0, 16).replace("T", " ")} — ${who} on ${task?.title ?? "task"}: ${short}`
    )
    if (commentLines.length >= MAX_COMMENTS) break
  }

  const { data: newTasks, error: ntErr } = await sb
    .from("admin_tasks")
    .select("title, created_at")
    .gte("created_at", sinceIso)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(MAX_NEW_TASKS)

  if (ntErr) throw new Error(ntErr.message)

  const newTaskLines = (newTasks ?? []).map(
    (t) =>
      `${(t.created_at as string).slice(0, 16).replace("T", " ")} — ${t.title as string}`
  )

  const { data: newProjects, error: npErr } = await sb
    .from("admin_projects")
    .select("name, created_at")
    .gte("created_at", sinceIso)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(MAX_NEW_PROJECTS)

  if (npErr) throw new Error(npErr.message)

  const newProjectLines = (newProjects ?? []).map(
    (p) =>
      `${(p.created_at as string).slice(0, 16).replace("T", " ")} — ${p.name as string}`
  )

  return {
    periodLabel,
    sinceIso,
    activityLines,
    commentLines,
    newTaskLines,
    newProjectLines,
  }
}

function sectionHtml(title: string, items: string[]): string {
  if (items.length === 0) {
    return `<h2 style="font-size:15px;margin:20px 0 8px;">${title}</h2><p style="color:#666;font-size:14px;">No entries this week.</p>`
  }
  const lis = items
    .map(
      (line) =>
        `<li style="margin:6px 0;font-size:14px;line-height:1.45;">${escapeHtml(line)}</li>`
    )
    .join("")
  return `<h2 style="font-size:15px;margin:20px 0 8px;">${title} (${items.length})</h2><ul style="padding-left:20px;margin:0;">${lis}</ul>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function digestPayloadToHtml(payload: DigestPayload): string {
  const base = getAppUrl()
  const opsUrl = `${base}/admin/operations`
  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;color:#111;max-width:640px;">
  <h1 style="font-size:18px;">Operations — weekly summary</h1>
  <p style="font-size:14px;color:#444;">Period: ${escapeHtml(payload.periodLabel)} (last 7 days)</p>
  <p style="font-size:14px;"><a href="${opsUrl}">Open Operations</a></p>
  ${sectionHtml("New tasks", payload.newTaskLines)}
  ${sectionHtml("New projects", payload.newProjectLines)}
  ${sectionHtml("Comments on tasks", payload.commentLines)}
  ${sectionHtml("Task activity", payload.activityLines)}
  <p style="font-size:12px;color:#888;margin-top:28px;">You receive this because weekly Operations digests are enabled for admins.</p>
</body>
</html>
`.trim()
}

export function digestPayloadToText(payload: DigestPayload): string {
  const base = getAppUrl()
  const lines = [
    "Operations — weekly summary",
    `Period: ${payload.periodLabel} (last 7 days)`,
    `Open Operations: ${base}/admin/operations`,
    "",
    `New tasks (${payload.newTaskLines.length})`,
    ...payload.newTaskLines.map((l) => `  • ${l}`),
    "",
    `New projects (${payload.newProjectLines.length})`,
    ...payload.newProjectLines.map((l) => `  • ${l}`),
    "",
    `Comments (${payload.commentLines.length})`,
    ...payload.commentLines.map((l) => `  • ${l}`),
    "",
    `Task activity (${payload.activityLines.length})`,
    ...payload.activityLines.map((l) => `  • ${l}`),
  ]
  return lines.join("\n")
}

export async function listAdminEmails(): Promise<string[]> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("profiles")
    .select("email")
    .eq("role", "admin")
    .not("email", "is", null)
    .order("email")

  if (error) throw new Error(error.message)
  const emails = (data ?? [])
    .map((r) => (r.email as string)?.trim())
    .filter(Boolean) as string[]
  return [...new Set(emails)]
}

/**
 * Sends digest to each admin. Returns counts; caller may persist last_sent_at on full success.
 */
export async function sendOperationsDigestEmails(
  payload: DigestPayload
): Promise<{ sent: number; failed: number }> {
  const html = digestPayloadToHtml(payload)
  const text = digestPayloadToText(payload)
  const subject = `Operations weekly summary — ${payload.periodLabel}`

  const recipients = await listAdminEmails()
  let sent = 0
  let failed = 0

  for (const to of recipients) {
    const ok = await sendGridService.sendEmail({
      to,
      subject,
      html,
      text,
      emailKind: "operations_digest",
    })
    if (ok) sent += 1
    else failed += 1
  }

  return { sent, failed }
}

export function digestLookbackSince(): Date {
  return new Date(Date.now() - DIGEST_LOOKBACK_MS)
}

const MIN_MS_BETWEEN_SENDS = 5 * 24 * 60 * 60 * 1000

/**
 * Cron entry: respects enabled flag, Europe/Stockholm Sunday 12:00 window, and dedupe.
 */
export async function runScheduledWeeklyOperationsDigest(): Promise<
  Record<string, string | number | boolean | null>
> {
  const settings = await getWeeklyDigestSettings()
  if (!settings.enabled) {
    return { ok: true, skipped: "disabled" }
  }
  if (!isStockholmSundayNoonWindow(new Date())) {
    return { ok: true, skipped: "not_time_slot" }
  }
  if (wasSentRecently(settings.last_sent_at, MIN_MS_BETWEEN_SENDS)) {
    return { ok: true, skipped: "already_sent_recently" }
  }

  const payload = await buildOperationsDigestPayload(digestLookbackSince())
  const { sent, failed } = await sendOperationsDigestEmails(payload)

  if (sent === 0) {
    return {
      ok: false,
      error: "no_emails_sent",
      sent: 0,
      failed,
    }
  }

  await markWeeklyDigestSent()
  return { ok: true, sent, failed }
}
