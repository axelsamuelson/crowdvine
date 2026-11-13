import { parseTaskSourceMarker } from "@/lib/operations/ops-agents"
import { cleanTaskTitle } from "./column-rules"

/**
 * Display title for Drift lists.
 * Always use cleaned `admin_tasks.title` — never a description line
 * (prod PR backfills put a GitHub URL on the line after `källa: PR #n`).
 * Empty cleaned title + PR marker → `PR #n` (projectHint only then).
 */
export function formatDriftTaskHeading(
  task: { title: string; description?: string | null },
  projectName?: string | null,
): { heading: string; projectHint?: string } {
  const cleaned = cleanTaskTitle(task.title)
  if (cleaned) {
    return { heading: cleaned }
  }
  const marker = parseTaskSourceMarker(task.description)
  if (marker?.kind === "pr") {
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
  if (projectHint && heading.startsWith("PR #")) {
    return `${heading} · ${projectHint}`
  }
  return heading
}
