import Link from "next/link"
import { ChevronRight, Unlink } from "lucide-react"

interface StrategicLevel {
  label: string
  href: string
  title: string
}

/** Sista steget (sidan du står på): etikett ovanför `current`. */
export type StrategicBreadcrumbCurrentLevel =
  | "goal"
  | "objective"
  | "project"
  | "task"
  | "kr"

interface Props {
  goal?: { id: string; title: string } | null
  objective?: { id: string; title: string } | null
  key_result?: { id: string; title: string } | null
  project?: { id: string; name: string } | null
  current: string
  /** GOAL / OBJECTIVE / PROJECT / TASK ovanför `current` (t.ex. task- eller projektsida). */
  currentLevel?: StrategicBreadcrumbCurrentLevel
  showUnlinkedWarning?: boolean
}

function levelTagText(label: string): string {
  return label === "KR" ? "KR" : label.toUpperCase()
}

function currentLevelTagText(level: StrategicBreadcrumbCurrentLevel): string {
  return level === "kr" ? "KR" : level.toUpperCase()
}

export function StrategicBreadcrumb({
  goal,
  objective,
  key_result,
  project,
  current,
  currentLevel,
  showUnlinkedWarning = true,
}: Props) {
  const levels: StrategicLevel[] = []

  if (goal) {
    levels.push({
      label: "Goal",
      href: `/admin/operations/goals/${goal.id}`,
      title: goal.title,
    })
  }

  if (objective) {
    levels.push({
      label: "Objective",
      href: `/admin/operations/objectives/${objective.id}`,
      title: objective.title,
    })
  }

  if (key_result && objective) {
    levels.push({
      label: "KR",
      href: `/admin/operations/objectives/${objective.id}`,
      title: key_result.title,
    })
  }

  if (project) {
    levels.push({
      label: "Project",
      href: `/admin/operations/projects/${project.id}`,
      title: project.name,
    })
  }

  const isUnlinked = levels.length === 0

  const tagClass =
    "text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"

  return (
    <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-3 text-sm">
      {levels.map((level, i) => (
        <span
          key={i}
          className="flex min-w-0 max-w-full items-start gap-2 sm:max-w-[min(100%,22rem)]"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={tagClass}>{levelTagText(level.label)}</span>
            <Link
              href={level.href}
              className="min-w-0 break-words leading-snug text-gray-600 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors"
              title={level.title}
              aria-label={`${level.label}: ${level.title}`}
            >
              {level.title}
            </Link>
          </span>
          <ChevronRight
            className="mt-1 h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500"
            aria-hidden
          />
        </span>
      ))}

      <span className="flex min-w-0 max-w-full flex-1 basis-full flex-col gap-0.5 sm:basis-auto sm:max-w-2xl">
        {currentLevel ? (
          <span className={tagClass}>{currentLevelTagText(currentLevel)}</span>
        ) : null}
        <span className="break-words leading-snug font-medium text-gray-900 dark:text-gray-100">
          {current}
        </span>
      </span>

      {isUnlinked && showUnlinkedWarning && (
        <span
          className="flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400 sm:ml-1"
          title="Not linked to any project or objective"
        >
          <Unlink className="h-3 w-3" />
          Unlinked
        </span>
      )}
    </div>
  )
}
