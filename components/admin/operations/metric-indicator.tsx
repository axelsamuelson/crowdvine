import { ProgressBar } from "@/components/admin/operations/progress-bar"

export type MetricIndicatorProps = {
  label: string
  current: number
  target: number | null
  unit: string
  progress: number
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1)
}

export function MetricIndicator({
  label,
  current,
  target,
  unit,
  progress,
}: MetricIndicatorProps) {
  return (
    <div className="space-y-1.5 rounded-lg border border-gray-100 dark:border-zinc-800/80 bg-gray-50/80 dark:bg-zinc-900/40 px-3 py-2">
      <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
        {label}
      </p>
      <p className="text-sm tabular-nums text-gray-900 dark:text-zinc-100">
        <span className="font-semibold">{formatNum(current)}</span>
        {target != null && (
          <>
            <span className="mx-1 text-gray-400 dark:text-zinc-500">/</span>
            <span className="text-gray-600 dark:text-zinc-400">
              {formatNum(target)}
            </span>
          </>
        )}
        {unit && (
          <span className="ml-1.5 text-gray-600 dark:text-zinc-400">
            {unit}
          </span>
        )}
      </p>
      {target != null && (
        <ProgressBar value={progress} size="sm" showLabel />
      )}
    </div>
  )
}
