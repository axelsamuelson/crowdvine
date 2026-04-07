"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addMetricExcludedProfile,
  removeMetricExcludedProfile,
  searchProfilesForMetricExclusion,
} from "@/lib/actions/metrics-exclusions"
import type { MetricsExcludedProfileRow } from "@/lib/actions/metrics-exclusions"

type Props = {
  initialRows: MetricsExcludedProfileRow[]
}

export function MetricsExclusionsSettings({ initialRows }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [rows, setRows] = useState(initialRows)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<{ id: string; email: string | null }[]>([])
  const [note, setNote] = useState("")

  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    const t = setTimeout(() => {
      start(async () => {
        try {
          const r = await searchProfilesForMetricExclusion(q)
          setHits(
            r.filter((x) => !rows.some((row) => row.profile_id === x.id))
          )
        } catch {
          setHits([])
        }
      })
    }, 300)
    return () => clearTimeout(t)
  }, [query, rows])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const fieldClass =
    "h-9 text-sm rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-0 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-zinc-500"

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
          Lägg till exkludering
        </h2>
        <p className="text-xs leading-relaxed text-gray-700 dark:text-zinc-300">
          Sök på e-post. Alla{" "}
          <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-900 dark:bg-zinc-800 dark:text-zinc-200">
            user_events
          </code>{" "}
          för användaren räknas bort (t.ex. add_to_cart, product_viewed).
          Signups, ordrar och konverteringsmetrics ignorerar också dessa profiler.
        </p>
        <div className="space-y-2">
          <Label
            htmlFor="excl-search"
            className="text-xs font-medium text-gray-800 dark:text-zinc-200"
          >
            Sök profil (e-post)
          </Label>
          <Input
            id="excl-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Minst 2 tecken…"
            className={fieldClass}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="excl-note"
            className="text-xs font-medium text-gray-800 dark:text-zinc-200"
          >
            Anteckning (valfritt)
          </Label>
          <Input
            id="excl-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="T.ex. intern testanvändare"
            className={fieldClass}
            disabled={pending}
          />
        </div>
        {hits.length > 0 && (
          <ul className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 divide-y divide-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:divide-zinc-700">
            {hits.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-2 bg-white px-3 py-2.5 dark:bg-zinc-950"
              >
                <span className="truncate text-xs font-medium text-gray-900 dark:text-zinc-100">
                  {h.email ?? h.id}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      try {
                        await addMetricExcludedProfile(h.id, note)
                        toast.success("Tillagd och metrics uppdaterade")
                        setQuery("")
                        setHits([])
                        setNote("")
                        refresh()
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Kunde inte spara"
                        )
                      }
                    })
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" aria-hidden />
                  Exkludera
                </Button>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
          Exkluderade användare ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Inga exkluderingar ännu.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.profile_id}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-zinc-50">
                    {r.email ?? r.profile_id}
                  </p>
                  {r.note ? (
                    <p className="mt-0.5 text-xs text-gray-700 dark:text-zinc-300">
                      {r.note}
                    </p>
                  ) : null}
                  <p className="mt-1 font-mono text-[10px] text-gray-500 dark:text-zinc-500">
                    {r.profile_id}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      try {
                        await removeMetricExcludedProfile(r.profile_id)
                        toast.success("Borttagen och metrics uppdaterade")
                        refresh()
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Kunde inte ta bort"
                        )
                      }
                    })
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>
    </div>
  )
}
