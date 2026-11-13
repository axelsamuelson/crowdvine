import { parseTaskSourceMarker } from "@/lib/operations/ops-agents"
import { cleanTaskTitle } from "./column-rules"

const ENGLISHISH =
  /\b(the|and|for|with|from|into|after|before|fix|hot|fix|checkout|ensure|session|account|takeover|editorial|rewrite|footer|test|removal|guide|swedish red)\b/i

function looksEnglish(text: string): boolean {
  if (/[åäöÅÄÖ]/.test(text)) return false
  return ENGLISHISH.test(text)
}

/**
 * Display title for Drift lists.
 * PR rows: short Swedish heading (description line 2), or `PR #n` — never English PR title.
 */
export function formatDriftTaskHeading(
  task: { title: string; description?: string | null },
  projectName?: string | null,
): { heading: string; projectHint?: string } {
  const marker = parseTaskSourceMarker(task.description)
  if (marker?.kind === "pr") {
    const lines = (task.description ?? "").split(/\r?\n/).map((l) => l.trim())
    const swedishLine = lines.slice(1).find((l) => l.length > 0)
    if (swedishLine) {
      return { heading: swedishLine, projectHint: projectName ?? undefined }
    }
    const cleaned = cleanTaskTitle(task.title).replace(/^PR\s*#?\d+\s*[:–-]?\s*/i, "")
    if (cleaned && !looksEnglish(cleaned)) {
      return { heading: cleaned, projectHint: projectName ?? undefined }
    }
    return {
      heading: `PR #${marker.prNumber}`,
      projectHint: projectName ?? undefined,
    }
  }
  return { heading: cleanTaskTitle(task.title) }
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
