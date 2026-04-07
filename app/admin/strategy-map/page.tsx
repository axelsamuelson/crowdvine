import { Suspense } from "react"
import Link from "next/link"
import { Target } from "lucide-react"
import {
  getGoals,
  getObjectives,
  getProjects,
  getTasks,
} from "@/lib/actions/operations"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { AdminUserMin } from "@/lib/types/operations"
import { StrategyMapCanvas } from "./_components/strategy-map-canvas"
import { Skeleton } from "@/components/ui/skeleton"

function StrategyMapSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-[min(70vh,640px)] w-full rounded-xl" />
    </div>
  )
}

async function StrategyMapData() {
  const sb = getSupabaseAdmin()
  const [goals, objectives, projects, tasks, adminsRes] = await Promise.all([
    getGoals({}),
    getObjectives({}),
    getProjects({}),
    getTasks({}),
    sb
      .from("profiles")
      .select("id, email")
      .eq("role", "admin")
      .order("email"),
  ])

  const admins = (adminsRes.data ?? []) as AdminUserMin[]

  const empty =
    goals.length === 0 &&
    objectives.length === 0 &&
    projects.length === 0 &&
    tasks.length === 0

  if (empty) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-8 py-16 text-center text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950/60">
          <Target className="h-7 w-7 text-blue-700 dark:text-blue-300" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Ingen strategisk data ännu
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Skapa ditt första objective för att se hur arbete, projekt och
            uppgifter hänger ihop i grafen.
          </p>
        </div>
        <Link
          href="/admin/operations/objectives"
          className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Skapa ditt första objective
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <StrategyMapCanvas
        initial={{ goals, objectives, projects, tasks }}
        admins={admins}
      />
    </div>
  )
}

export default function StrategyMapPage() {
  return (
    <Suspense fallback={<StrategyMapSkeleton />}>
      <StrategyMapData />
    </Suspense>
  )
}
