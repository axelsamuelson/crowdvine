interface Props {
  value: number // 0–100
  showLabel?: boolean
  size?: "sm" | "md"
}

function getColor(value: number): string {
  if (value >= 70) return "bg-green-500 dark:bg-green-600"
  if (value >= 40) return "bg-amber-500 dark:bg-amber-600"
  return "bg-red-500 dark:bg-red-600"
}

export function ProgressBar({
  value,
  showLabel = true,
  size = "md",
}: Props) {
  const clamped = Math.min(100, Math.max(0, value))
  const height = size === "sm" ? "h-1" : "h-1.5"

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className={`flex-1 rounded-full bg-gray-200 dark:bg-gray-700 ${height} overflow-hidden`}
      >
        <div
          className={`${height} rounded-full transition-all duration-300 ${getColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums w-8 text-right">
          {clamped}%
        </span>
      )}
    </div>
  )
}
