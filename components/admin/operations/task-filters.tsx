"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type {
  ProjectMin,
  ObjectiveMin,
  AdminUserMin,
} from "@/lib/types/operations"

interface Props {
  projects: ProjectMin[]
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
}

export function TaskFilters({ projects, objectives, admins }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== "__all__") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page")
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, router]
  )

  function clearAll() {
    router.push(pathname)
  }

  const hasFilters = Array.from(searchParams.keys()).length > 0

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        placeholder="Search tasks..."
        className="h-9 w-full min-w-0 rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-500 dark:placeholder:text-zinc-400 text-sm sm:w-48 sm:max-w-xs sm:flex-none"
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => updateParam("search", e.target.value || null)}
      />

      <div className="grid grid-cols-2 gap-2 sm:contents">
      <Select
        value={searchParams.get("status") ?? "__all__"}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="h-9 w-full rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm sm:w-36 sm:flex-none">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All statuses</SelectItem>
          <SelectItem value="todo">Todo</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
          <SelectItem value="review">Review</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("priority") ?? "__all__"}
        onValueChange={(v) => updateParam("priority", v)}
      >
        <SelectTrigger className="h-9 w-full rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm sm:w-32 sm:flex-none">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All priorities</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("assigned_to") ?? "__all__"}
        onValueChange={(v) => updateParam("assigned_to", v)}
      >
        <SelectTrigger className="h-9 w-full rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm sm:w-40 sm:flex-none">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All assignees</SelectItem>
          {admins.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.email.split("@")[0]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("project_id") ?? "__all__"}
        onValueChange={(v) => updateParam("project_id", v)}
      >
        <SelectTrigger className="h-9 w-full rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm sm:w-40 sm:flex-none">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All projects</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("objective_id") ?? "__all__"}
        onValueChange={(v) => updateParam("objective_id", v)}
      >
        <SelectTrigger className="h-9 w-full rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm sm:w-44 sm:flex-none">
          <SelectValue placeholder="Objective" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All objectives</SelectItem>
          {objectives.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-9 w-full rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 sm:w-auto sm:flex-none"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
