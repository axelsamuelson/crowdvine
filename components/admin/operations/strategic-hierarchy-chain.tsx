import Link from "next/link"
import { ChevronRight, Unlink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StrategicBreadcrumbCurrentLevel } from "./strategic-breadcrumb"

export type { StrategicBreadcrumbCurrentLevel }

type ChainVariant = "goal" | "objective" | "kr" | "project" | "task"

interface ChainStep {
  key: string
  label: string
  href: string | null
  title: string
  variant: ChainVariant
  isCurrent: boolean
}

const variantStyles: Record<
  ChainVariant,
  { dot: string; label: string }
> = {
  goal: {
    dot: "bg-violet-500 dark:bg-violet-400",
    label: "text-violet-700 dark:text-violet-300",
  },
  objective: {
    dot: "bg-sky-500 dark:bg-sky-400",
    label: "text-sky-800 dark:text-sky-200",
  },
  kr: {
    dot: "bg-indigo-500 dark:bg-indigo-400",
    label: "text-indigo-800 dark:text-indigo-200",
  },
  project: {
    dot: "bg-amber-500 dark:bg-amber-400",
    label: "text-amber-900 dark:text-amber-200",
  },
  task: {
    dot: "bg-emerald-600 dark:bg-emerald-400",
    label: "text-emerald-900 dark:text-emerald-300",
  },
}

function currentLevelLabel(level: StrategicBreadcrumbCurrentLevel): string {
  return level === "kr" ? "KR" : level.charAt(0).toUpperCase() + level.slice(1)
}

function variantForCurrentLevel(
  level: StrategicBreadcrumbCurrentLevel,
): ChainVariant {
  if (level === "kr") return "kr"
  if (level === "goal") return "goal"
  if (level === "objective") return "objective"
  if (level === "project") return "project"
  return "task"
}

interface Props {
  goal?: { id: string; title: string } | null
  objective?: { id: string; title: string } | null
  key_result?: { id: string; title: string } | null
  /** På task-sida: länkat projekt (mellan objective och task). På projekt-sida: utelämna. */
  project?: { id: string; name: string } | null
  current: string
  currentLevel?: StrategicBreadcrumbCurrentLevel
  showUnlinkedWarning?: boolean
  /** Inuti större kort: ingen egen ram/bakgrund. */
  embedded?: boolean
}

/**
 * Kompakt horisontell kedja Goal → Objective → (KR) → Project → nuvarande nivå.
 * Matchar admin operations (border, `#0F0F12` dark), minimal vertikal yta.
 */
export function StrategicHierarchyChain({
  goal,
  objective,
  key_result,
  project,
  current,
  currentLevel = "task",
  showUnlinkedWarning = true,
  embedded = false,
}: Props) {
  const steps: ChainStep[] = []

  if (goal) {
    steps.push({
      key: `goal-${goal.id}`,
      label: "Goal",
      href: `/admin/operations/goals/${goal.id}`,
      title: goal.title,
      variant: "goal",
      isCurrent: false,
    })
  }

  if (objective) {
    steps.push({
      key: `obj-${objective.id}`,
      label: "Objective",
      href: `/admin/operations/objectives/${objective.id}`,
      title: objective.title,
      variant: "objective",
      isCurrent: false,
    })
  }

  if (key_result && objective) {
    steps.push({
      key: `kr-${key_result.id}`,
      label: "KR",
      href: `/admin/operations/objectives/${objective.id}`,
      title: key_result.title,
      variant: "kr",
      isCurrent: false,
    })
  }

  if (project && currentLevel === "task") {
    steps.push({
      key: `proj-${project.id}`,
      label: "Project",
      href: `/admin/operations/projects/${project.id}`,
      title: project.name,
      variant: "project",
      isCurrent: false,
    })
  }

  steps.push({
    key: "current",
    label: currentLevelLabel(currentLevel),
    href: null,
    title: current,
    variant: variantForCurrentLevel(currentLevel),
    isCurrent: true,
  })

  const hasStrategyAnchor = Boolean(goal || objective || project)
  const isTaskUnlinked =
    currentLevel === "task" && !hasStrategyAnchor && showUnlinkedWarning

  if (isTaskUnlinked) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-200/90 bg-amber-50/70 px-2.5 py-2 dark:border-amber-900/50 dark:bg-amber-950/25">
        <Unlink
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div className="min-w-0 text-[11px] leading-snug text-amber-900 dark:text-amber-200/95">
          <p className="font-medium">Inte kopplad till strategi</p>
          <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/85">
            Länka tasken till ett projekt eller objective under Detaljer → Redigera.
          </p>
        </div>
      </div>
    )
  }

  return (
    <nav
      aria-label="Strategisk kedja"
      className={cn(
        "overflow-hidden",
        embedded
          ? "border-0 bg-transparent px-0 py-0.5"
          : "rounded-lg border border-gray-200 bg-white px-2 py-1.5 dark:border-zinc-800 dark:bg-[#0F0F12]",
      )}
    >
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {steps.map((step, index) => {
          const styles = variantStyles[step.variant]
          const titleClass = cn(
            "min-w-0 max-w-[min(100vw-4rem,28rem)] truncate text-xs leading-tight text-gray-900 dark:text-zinc-100",
            step.isCurrent && "font-semibold",
            !step.isCurrent &&
              step.href &&
              "text-gray-800 transition-colors hover:text-violet-700 hover:underline dark:text-zinc-200 dark:hover:text-violet-300",
          )

          return (
            <li
              key={step.key}
              className="flex min-w-0 max-w-full items-baseline gap-1.5"
            >
              {index > 0 && (
                <span
                  className="flex shrink-0 items-center text-gray-300 dark:text-zinc-600"
                  aria-hidden
                >
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
              )}
              <span
                className={cn(
                  "mt-[1px] h-1.5 w-1.5 shrink-0 rounded-full",
                  styles.dot,
                  step.isCurrent && "h-2 w-2",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "shrink-0 text-[9px] font-bold uppercase tracking-wide",
                  styles.label,
                )}
              >
                {step.label}
              </span>
              {step.href ? (
                <Link href={step.href} className={titleClass} title={step.title}>
                  {step.title}
                </Link>
              ) : (
                <span className={titleClass} title={step.title}>
                  {step.title}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
