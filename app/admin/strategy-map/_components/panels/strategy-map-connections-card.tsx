"use client"

import { cn } from "@/lib/utils"

export type StrategyMapConnectionCategory =
  | "goal"
  | "objective"
  | "project"
  | "task"
  | "aggregate"

export type StrategyMapConnectionItem = {
  id: string
  category: StrategyMapConnectionCategory
  label: string
  title: string
}

export function StrategyMapConnectionsCard({
  items,
}: {
  items: StrategyMapConnectionItem[]
}) {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 dark:border-[#1F1F23]",
        "bg-gray-50/40 dark:bg-zinc-900/30"
      )}
    >
      <div className="border-b border-gray-200 px-3 py-2 dark:border-zinc-800">
        <p className="text-xs font-medium text-gray-600 dark:text-zinc-400">
          Kopplingar
        </p>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
        {items.map((item) => (
          <li key={item.id} className="px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
              {item.label}
            </p>
            <p className="mt-0.5 text-sm leading-snug text-gray-900 dark:text-zinc-100">
              {item.title}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
