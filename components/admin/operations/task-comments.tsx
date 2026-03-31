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
      toast.success("Comment added")
      router.refresh()
    } catch {
      toast.error("Failed to add comment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 bg-white dark:bg-[#0F0F12] space-y-4">
      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Comments ({comments.length})
      </h2>

      {comments.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No comments yet
        </p>
      )}

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 text-sm">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
              {comment.author?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                  {comment.author?.email?.split("@")[0] ?? "Unknown"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {dateFmt.format(new Date(comment.created_at))}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {comment.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#1F1F23]">
        <Textarea
          placeholder="Add a comment..."
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="rounded-lg border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-zinc-900/40 text-gray-900 dark:text-zinc-100 placeholder:text-gray-500 dark:placeholder:text-zinc-500"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={loading || !body.trim()}
          className="rounded-lg bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </div>
  )
}
