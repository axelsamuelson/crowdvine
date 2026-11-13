import { parseTaskSourceMarker } from "@/lib/operations/ops-agents"
import { cleanTaskTitle } from "./column-rules"

/**
 * Display title for Drift lists (v4.1).
 * Always use cleaned `admin_tasks.title` — never a description line.
 * PR marker + cleaned title → `PR #n · <title>`.
 * PR marker + empty title → `PR #n` (projectHint only then).
 */
export function formatDriftTaskHeading(
  task: { title: string; description?: string | null },
  projectName?: string | null,
): { heading: string; projectHint?: string } {
  const cleaned = cleanTaskTitle(task.title)
  const marker = parseTaskSourceMarker(task.description)
  if (marker?.kind === "pr") {
    if (cleaned) {
      return { heading: `PR #${marker.prNumber} · ${cleaned}` }
    }
    return {
      heading: `PR #${marker.prNumber}`,
      projectHint: projectName ?? undefined,
    }
  }
  return { heading: cleaned }
}

export function formatDriftTaskHeadingLine(
  task: { title: string; description?: string | null },
  projectName?: string | null,
): string {
  const { heading, projectHint } = formatDriftTaskHeading(task, projectName)
  if (projectHint && /^PR #\d+$/.test(heading)) {
    return `${heading} · ${projectHint}`
  }
  return heading
}

/** Drop trailing parenthetical, e.g. "Konvertering (CRO)" → "Konvertering". */
export function formatProjectTagLabel(name: string | null | undefined): string | null {
  if (!name) return null
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name
}

const GITHUB_URL_RE = /^https?:\/\/(www\.)?github\.com\/\S+/i

/**
 * Description for the detail panel: strip the first-line source marker and
 * any GitHub URL lines. Remaining text is shown as-is.
 */
export function stripDescriptionForPanel(
  description: string | null | undefined,
): string {
  if (!description) return ""
  const lines = description.split(/\r?\n/)
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trimEnd()
    const trimmed = line.trim()
    if (i === 0 && /^källa:\s*(PR #\d+|ops_agent_log\s+\S+)/i.test(trimmed)) {
      continue
    }
    if (GITHUB_URL_RE.test(trimmed)) continue
    out.push(line)
  }
  return out.join("\n").trim()
}

/** Extract a GitHub PR URL from description body (not the marker line). */
export function extractPrUrlFromDescription(
  description: string | null | undefined,
): string | null {
  if (!description) return null
  for (const raw of description.split(/\r?\n/)) {
    const trimmed = raw.trim()
    if (GITHUB_URL_RE.test(trimmed)) return trimmed
  }
  return null
}

export type DriftTaskBadge = "waiting_for_you" | "waiting_for_review" | null

/**
 * v4.1 badges for in_progress (Pågår) rows.
 * - waiting_for_you: open ops_approval_queue row (väntar) with same task_id
 * - waiting_for_review: description first line is källa: PR #n
 */
export function deriveDriftTaskBadge(input: {
  status: string
  title: string
  description?: string | null
  waitingQueueTaskIds: Set<string>
  taskId: string
}): DriftTaskBadge {
  if (input.status !== "in_progress") return null
  if (/\[PAUSAD\]/i.test(input.title)) return null
  if (input.waitingQueueTaskIds.has(input.taskId)) return "waiting_for_you"
  const marker = parseTaskSourceMarker(input.description)
  if (marker?.kind === "pr") return "waiting_for_review"
  return null
}
