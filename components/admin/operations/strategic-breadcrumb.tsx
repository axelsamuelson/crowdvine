import Link from "next/link"
import { ChevronRight, Unlink } from "lucide-react"

interface StrategicLevel {
  label: string
  href: string
  title: string
}

interface Props {
  objective?: { id: string; title: string } | null
  key_result?: { id: string; title: string } | null
  project?: { id: string; name: string } | null
  current: string
  showUnlinkedWarning?: boolean
}

export function StrategicBreadcrumb({
  objective,
  key_result,
  project,
  current,
  showUnlinkedWarning = true,
}: Props) {
  const levels: StrategicLevel[] = []

  if (objective) {
    levels.push({
      label: "Objective",
      href: `/admin/operations/okrs/${objective.id}`,
      title: objective.title,
    })
  }

  if (key_result && objective) {
    levels.push({
      label: "KR",
      href: `/admin/operations/okrs/${objective.id}`,
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

  return (
    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
      {levels.map((level, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {level.label}
          </span>
          <Link
            href={level.href}
            className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors truncate max-w-[180px]"
            title={level.title}
          >
            {level.title}
          </Link>
          <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        </span>
      ))}

      <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
        {current}
      </span>

      {isUnlinked && showUnlinkedWarning && (
        <span
          className="flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400 ml-2"
          title="Not linked to any project or objective"
        >
          <Unlink className="h-3 w-3" />
          Unlinked
        </span>
      )}
    </div>
  )
}
