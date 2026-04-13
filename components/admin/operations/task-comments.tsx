"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { addComment } from "@/lib/actions/operations"
import type { TaskComment } from "@/lib/types/operations"

interface Props {
  task_id: string
  comments: TaskComment[]
  current_admin_id: string
}

export function TaskComments({
  task_id,
  comments,
  current_admin_id: _current_admin_id,
}: Props) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)
  const dateFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "UTC" })

  async function handleSubmit() {
    if (!body.trim()) return
    setLoading(true)
    try {
      await addComment(task_id, body.trim())
      setBody("")
      toast.success("Kommentar tillagd")
      router.refresh()
    } catch {
      toast.error("Kunde inte lägga till kommentar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:shadow-none sm:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
        Kommentarer{" "}
        <span className="font-normal text-gray-400 dark:text-zinc-600">
          ({comments.length})
        </span>
      </h2>

      {comments.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Inga kommentarer ännu.
        </p>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="flex gap-3 border-b border-gray-100 pb-4 text-sm last:border-0 last:pb-0 dark:border-zinc-800/80"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
              {comment.author?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-xs font-medium text-gray-800 dark:text-zinc-200">
                  {comment.author?.email?.split("@")[0] ?? "Okänd"}
                </span>
                <span className="text-xs text-gray-500 dark:text-zinc-500">
                  {dateFmt.format(new Date(comment.created_at))}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-gray-600 dark:text-zinc-400">
                {comment.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-zinc-800">
        <Textarea
          placeholder="Skriv en kommentar…"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="rounded-lg border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 dark:border-[#1F1F23] dark:bg-zinc-900/40 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={loading || !body.trim()}
          className="rounded-lg bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Skickar…" : "Skicka"}
        </Button>
      </div>
    </div>
  )
}
