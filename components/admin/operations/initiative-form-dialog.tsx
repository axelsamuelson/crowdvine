"use client"

import { useState, useTransition } from "react"
import {
  createInitiative,
  updateInitiative,
  type InitiativeInput,
} from "@/lib/actions/initiatives"
import type { DriftCompany } from "@/lib/operations/drift/priority-rules"
import {
  ADMIN_FORM_FIELDS_CLASS,
  ADMIN_OUTLINE_BUTTON_CLASS,
} from "@/lib/admin-form-styles"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface InitiativeRow {
  id: string
  key: string
  title: string
  owner_agent: string
  sort_order: number
  status?: string | null
}

interface Props {
  objectiveId: string
  company: DriftCompany
  nextSortOrder: number
  nextKeyHint: string
  initiative?: InitiativeRow | null
  triggerLabel?: string
}

export function InitiativeFormDialog({
  objectiveId,
  company,
  nextSortOrder,
  nextKeyHint,
  initiative = null,
  triggerLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const editing = !!initiative

  const [key, setKey] = useState(initiative?.key ?? nextKeyHint)
  const [title, setTitle] = useState(initiative?.title ?? "")
  const [ownerAgent, setOwnerAgent] = useState(initiative?.owner_agent ?? "")
  const [sortOrder, setSortOrder] = useState(
    initiative?.sort_order ?? nextSortOrder,
  )

  function reset() {
    setKey(initiative?.key ?? nextKeyHint)
    setTitle(initiative?.title ?? "")
    setOwnerAgent(initiative?.owner_agent ?? "")
    setSortOrder(initiative?.sort_order ?? nextSortOrder)
    setError(null)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload: InitiativeInput = {
      objective_id: objectiveId,
      company,
      key,
      title,
      owner_agent: ownerAgent,
      sort_order: Number(sortOrder) || 1,
    }
    startTransition(async () => {
      try {
        if (editing && initiative) {
          await updateInitiative(initiative.id, payload)
        } else {
          await createInitiative(payload)
        }
        setOpen(false)
        reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunde inte spara")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={ADMIN_OUTLINE_BUTTON_CLASS}
        >
          {triggerLabel ?? (editing ? "Redigera initiativ" : "Nytt initiativ")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Redigera initiativ" : "Nytt initiativ"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              Nyckel
            </span>
            <input
              className={ADMIN_FORM_FIELDS_CLASS}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              placeholder="1.1"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              Titel
            </span>
            <input
              className={ADMIN_FORM_FIELDS_CLASS}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              Ansvarig bot
            </span>
            <input
              className={ADMIN_FORM_FIELDS_CLASS}
              value={ownerAgent}
              onChange={(e) => setOwnerAgent(e.target.value)}
              required
              placeholder="Camille"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              Ordning
            </span>
            <input
              type="number"
              min={1}
              className={ADMIN_FORM_FIELDS_CLASS}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className={ADMIN_OUTLINE_BUTTON_CLASS}
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sparar…" : "Spara"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
