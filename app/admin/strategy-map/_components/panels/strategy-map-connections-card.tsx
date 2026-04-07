"use client"

import type { LucideIcon } from "lucide-react"
import {
  Flag,
  FolderKanban,
  LayoutGrid,
  Link2,
  ListTodo,
  Target,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
  /** Kort typetikett, t.ex. "Objective" */
  label: string
  /** Visningsnamn eller sammanfattning */
  title: string
}

const categoryStyles: Record<
  StrategyMapConnectionCategory,
  {
    Icon: LucideIcon
    iconWrap: string
    icon: string
    badge: string
  }
> = {
  goal: {
    Icon: Flag,
    iconWrap:
      "bg-violet-100 ring-violet-200/80 dark:bg-violet-950/70 dark:ring-violet-800/60",
    icon: "text-violet-700 dark:text-violet-300",
    badge:
      "border-violet-200/80 bg-violet-50 text-violet-800 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-200",
  },
  objective: {
    Icon: Target,
    iconWrap:
      "bg-blue-100 ring-blue-200/80 dark:bg-blue-950/70 dark:ring-blue-800/60",
    icon: "text-blue-700 dark:text-blue-300",
    badge:
      "border-blue-200/80 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-200",
  },
  project: {
    Icon: FolderKanban,
    iconWrap:
      "bg-amber-100 ring-amber-200/80 dark:bg-amber-950/70 dark:ring-amber-800/60",
    icon: "text-amber-900 dark:text-amber-200",
    badge:
      "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-100",
  },
  task: {
    Icon: ListTodo,
    iconWrap:
      "bg-emerald-100 ring-emerald-200/80 dark:bg-emerald-950/70 dark:ring-emerald-800/60",
    icon: "text-emerald-800 dark:text-emerald-300",
    badge:
      "border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-100",
  },
  aggregate: {
    Icon: LayoutGrid,
    iconWrap:
      "bg-zinc-200/90 ring-zinc-300/80 dark:bg-zinc-800/80 dark:ring-zinc-600/60",
    icon: "text-zinc-700 dark:text-zinc-300",
    badge:
      "border-zinc-200/80 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200",
  },
}

function ConnectionRow({ item }: { item: StrategyMapConnectionItem }) {
  const { Icon } = categoryStyles[item.category]
  const s = categoryStyles[item.category]

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-zinc-200/70 bg-white/90 p-3 shadow-sm",
        "transition-[border-color,box-shadow] dark:border-zinc-700/80 dark:bg-zinc-950/40",
        "hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-600 dark:hover:bg-zinc-900/55"
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
          s.iconWrap
        )}
        aria-hidden
      >
        <Icon className={cn("size-4", s.icon)} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <Badge
          variant="outline"
          className={cn(
            "h-5 border px-1.5 py-0 text-[10px] font-semibold normal-case tracking-normal",
            s.badge
          )}
        >
          {item.label}
        </Badge>
        <p className="text-sm font-medium leading-snug text-gray-900 dark:text-zinc-100">
          {item.title}
        </p>
      </div>
    </div>
  )
}

export function StrategyMapConnectionsCard({
  items,
}: {
  items: StrategyMapConnectionItem[]
}) {
  if (items.length === 0) return null

  return (
    <Card
      className={cn(
        "overflow-hidden border-zinc-200/90 bg-gradient-to-b from-zinc-50/95 to-white shadow-sm",
        "dark:border-zinc-700/90 dark:from-zinc-950/90 dark:to-zinc-950/40"
      )}
    >
      <CardHeader className="space-y-0 pb-3 pt-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              "bg-zinc-200/80 text-zinc-700 ring-1 ring-zinc-300/60",
              "dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600/50"
            )}
            aria-hidden
          >
            <Link2 className="size-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Kopplingar
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
              Entiteter som hänger ihop med denna nod på strategikartan.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator className="bg-zinc-200/80 dark:bg-zinc-700/80" />
      <CardContent className="space-y-2.5 px-4 pb-4 pt-3">
        {items.map((item) => (
          <ConnectionRow key={item.id} item={item} />
        ))}
      </CardContent>
    </Card>
  )
}
