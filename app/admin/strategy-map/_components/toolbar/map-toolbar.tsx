"use client"

import type { ComponentType } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Maximize2,
  Target,
  FolderKanban,
  CheckSquare,
  Flag,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type StatusScope = "all" | "active" | "done"

export type MapToolbarState = {
  search: string
  showGoals: boolean
  showObjectives: boolean
  showProjects: boolean
  showTasks: boolean
  statusScope: StatusScope
  unconnectedOnly: boolean
}

const defaultState: MapToolbarState = {
  search: "",
  showGoals: true,
  showObjectives: true,
  showProjects: true,
  showTasks: true,
  statusScope: "all",
  unconnectedOnly: false,
}

export function defaultToolbarState(): MapToolbarState {
  return { ...defaultState }
}

interface Props {
  value: MapToolbarState
  onChange: (next: MapToolbarState) => void
  onFitView: () => void
  className?: string
}

export function MapToolbar({ value, onChange, onFitView, className }: Props) {
  const patch = (partial: Partial<MapToolbarState>) =>
    onChange({ ...value, ...partial })

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-100 p-3 text-zinc-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-[200px] max-w-md flex-1 items-center gap-2">
        <Input
          placeholder="Sök titel…"
          value={value.search}
          onChange={(e) => patch({ search: e.target.value })}
          className={cn(
            "h-9 rounded-lg text-sm",
            "border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-500",
            "focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30",
            "dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          )}
          aria-label="Sök i kartan"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Visa:
        </span>
        <ToggleIcon
          pressed={value.showGoals}
          onPressedChange={(showGoals) => patch({ showGoals })}
          label="Goals"
          icon={Flag}
        />
        <ToggleIcon
          pressed={value.showObjectives}
          onPressedChange={(showObjectives) => patch({ showObjectives })}
          label="Objectives"
          icon={Target}
        />
        <ToggleIcon
          pressed={value.showProjects}
          onPressedChange={(showProjects) => patch({ showProjects })}
          label="Projects"
          icon={FolderKanban}
        />
        <ToggleIcon
          pressed={value.showTasks}
          onPressedChange={(showTasks) => patch({ showTasks })}
          label="Tasks"
          icon={CheckSquare}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="status-scope"
            className="text-xs font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-300"
          >
            Status
          </Label>
          <Select
            value={value.statusScope}
            onValueChange={(v) => patch({ statusScope: v as StatusScope })}
          >
            <SelectTrigger
              id="status-scope"
              className={cn(
                "h-9 w-[140px] text-xs",
                "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50",
                "[&_svg]:text-zinc-600 dark:[&_svg]:text-zinc-400"
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className={cn(
                "border-zinc-200 bg-white text-zinc-900",
                "dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              )}
            >
              <SelectItem
                value="all"
                className="focus:bg-zinc-100 dark:focus:bg-zinc-700"
              >
                Alla
              </SelectItem>
              <SelectItem
                value="active"
                className="focus:bg-zinc-100 dark:focus:bg-zinc-700"
              >
                Aktiva
              </SelectItem>
              <SelectItem
                value="done"
                className="focus:bg-zinc-100 dark:focus:bg-zinc-700"
              >
                Avslutade
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="unconnected"
            checked={value.unconnectedOnly}
            onCheckedChange={(unconnectedOnly) => patch({ unconnectedOnly })}
            className={cn(
              "border-2 border-transparent",
              "data-[state=unchecked]:border-zinc-400 data-[state=unchecked]:bg-zinc-200",
              "dark:data-[state=unchecked]:border-zinc-500 dark:data-[state=unchecked]:bg-zinc-600",
              "data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600",
              "dark:data-[state=checked]:border-indigo-500 dark:data-[state=checked]:bg-indigo-600",
              "[&_span]:bg-white [&_span]:shadow-sm [&_span]:ring-1 [&_span]:ring-zinc-400/40",
              "dark:[&_span]:bg-zinc-100 dark:[&_span]:ring-zinc-700/50",
              "focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-offset-zinc-900"
            )}
          />
          <Label
            htmlFor="unconnected"
            className="cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Bara okopplade
          </Label>
        </div>

        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
            "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
            "dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
          )}
          onClick={onFitView}
        >
          <Maximize2 className="h-3.5 w-3.5 shrink-0" />
          Fit view
        </button>
      </div>
    </div>
  )
}

function ToggleIcon({
  pressed,
  onPressedChange,
  label,
  icon: Icon,
}: {
  pressed: boolean
  onPressedChange: (v: boolean) => void
  label: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
        pressed
          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm dark:border-indigo-500 dark:bg-indigo-600"
          : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      )}
      onClick={() => onPressedChange(!pressed)}
      aria-pressed={pressed}
      aria-label={`Visa ${label}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
