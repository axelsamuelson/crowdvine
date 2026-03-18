"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "./progress-bar"
import { updateKeyResult, deleteKeyResult } from "@/lib/actions/operations"
import { computeKeyResultProgress } from "@/lib/operations/progress"
import type { KeyResult } from "@/lib/types/operations"
import { Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Props {
  kr: KeyResult
}

export function KeyResultRow({ kr }: Props) {
  const router = useRouter()
  const [currentValue, setCurrentValue] = useState(kr.current_value.toString())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const progress = computeKeyResultProgress({
    ...kr,
    current_value: parseFloat(currentValue) || 0,
  })

  async function handleSave() {
    const val = parseFloat(currentValue)
    if (isNaN(val)) return
    setSaving(true)
    try {
      await updateKeyResult(kr.id, { current_value: val })
      toast.success("Key result updated")
      router.refresh()
    } catch {
      toast.error("Failed to update key result")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteKeyResult(kr.id)
      toast.success("Key result deleted")
      router.refresh()
    } catch {
      toast.error("Failed to delete key result")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-[#1F1F23] last:border-0">
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {kr.title}
          </p>
          {kr.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {kr.description}
            </p>
          )}
          <ProgressBar value={progress} size="sm" />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {kr.type === "binary" ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={
                  kr.current_value >= kr.target_value ? "default" : "outline"
                }
                className="h-7 text-xs"
                onClick={async () => {
                  setSaving(true)
                  try {
                    await updateKeyResult(kr.id, {
                      current_value:
                        kr.current_value >= kr.target_value
                          ? 0
                          : kr.target_value,
                    })
                    toast.success("Updated")
                    router.refresh()
                  } catch {
                    toast.error("Failed")
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving}
              >
                {kr.current_value >= kr.target_value ? "Done" : "Mark Done"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                step="any"
                className="h-7 w-20 text-xs text-right"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave()
                }}
                disabled={saving}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                / {kr.target_value}
              </span>
            </div>
          )}

          {kr.due_date && (
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {kr.due_date}
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:text-red-600"
            onClick={() => setDeleting(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete key result?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this key result.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
