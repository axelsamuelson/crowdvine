"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { createObjective, updateObjective } from "@/lib/actions/operations"
import type { Objective, AdminUserMin, GoalMin } from "@/lib/types/operations"

const PERIODS = [
  "Q1 2026",
  "Q2 2026",
  "Q3 2026",
  "Q4 2026",
  "H1 2026",
  "H2 2026",
  "Annual 2026",
  "Q1 2027",
  "Q2 2027",
  "Q3 2027",
  "Q4 2027",
  "H1 2027",
  "H2 2027",
  "Annual 2027",
]

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  period: z.string().min(1, "Period is required"),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]),
  strategy_area: z
    .enum(["Growth", "Quality", "Operations", "Product"])
    .nullable()
    .optional(),
  progress_method: z.enum(["manual", "key_results", "tasks", "insights"]),
  manual_progress: z.coerce
    .number()
    .min(0)
    .max(100)
    .nullable()
    .optional(),
  /** When progress_method = insights: target count (1–500). */
  insights_target: z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }, z.union([z.number().int().min(1).max(500), z.null()])),
  owner_id: z.string().nullable().optional(),
  goal_id: z.string().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  objective?: Objective | null
  admins: AdminUserMin[]
  goals?: GoalMin[]
  /** Pre-filled when creating from a goal detail page */
  defaultGoalId?: string | null
  /** Called after a successful create (not on edit). */
  onCreated?: (objective: Objective) => void | Promise<void>
}

export function ObjectiveFormDialog({
  open,
  onOpenChange,
  objective,
  admins,
  goals = [],
  defaultGoalId = null,
  onCreated,
}: Props) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!objective

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      period: "Q2 2026",
      status: "active",
      strategy_area: null,
      progress_method: "key_results",
      manual_progress: null,
      insights_target: 5,
      owner_id: null,
      goal_id: null as string | null,
    },
  })

  const progressMethod = form.watch("progress_method")

  useEffect(() => {
    if (objective) {
      form.reset({
        title: objective.title,
        description: objective.description ?? "",
        period: objective.period,
        status: objective.status,
        strategy_area: objective.strategy_area ?? null,
        progress_method: objective.progress_method,
        manual_progress: objective.manual_progress ?? null,
        insights_target:
          objective.progress_method === "insights"
            ? (objective.insights_target ?? 5)
            : 5,
        owner_id: objective.owner_id ?? null,
        goal_id: objective.goal_id ?? null,
      })
    } else {
      form.reset({
        title: "",
        description: "",
        period: "Q2 2026",
        status: "active",
        strategy_area: null,
        progress_method: "key_results",
        manual_progress: null,
        insights_target: 5,
        owner_id: null,
        goal_id: defaultGoalId ?? null,
      })
    }
  }, [objective, open, defaultGoalId])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      if (
        values.progress_method === "insights" &&
        (values.insights_target == null || values.insights_target < 1)
      ) {
        toast.error("Set how many insights are required (1–500)")
        setLoading(false)
        return
      }
      const payload = {
        ...values,
        goal_id: values.goal_id || null,
        manual_progress:
          values.progress_method === "manual"
            ? values.manual_progress ?? null
            : null,
        insights_target:
          values.progress_method === "insights"
            ? values.insights_target ?? null
            : null,
      }
      if (isEdit && objective) {
        await updateObjective(objective.id, payload)
        toast.success("Objective updated")
      } else {
        const created = await createObjective(payload)
        await Promise.resolve(onCreated?.(created))
        if (!onCreated) {
          toast.success("Objective created")
        }
      }
      onOpenChange(false)
      form.reset()
    } catch {
      toast.error(
        isEdit ? "Failed to update objective" : "Failed to create objective"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Objective" : "Create Objective"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What do you want to achieve?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERIODS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {goals.length > 0 && (
              <FormField
                control={form.control}
                name="goal_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No goal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No goal</SelectItem>
                        {goals.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="strategy_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strategy Area</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="Growth">Growth</SelectItem>
                        <SelectItem value="Quality">Quality</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Product">Product</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No owner</SelectItem>
                        {admins.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="progress_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="key_results">
                        Based on Key Results
                      </SelectItem>
                      <SelectItem value="tasks">Based on Tasks</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="insights">Insights</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Insights: add unique notes on the objective; progress reaches
                    100% when the target count is reached (objective can become
                    completed automatically).
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {progressMethod === "insights" && (
              <FormField
                control={form.control}
                name="insights_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required unique insights</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        placeholder="5"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value, 10) : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {progressMethod === "manual" && (
              <FormField
                control={form.control}
                name="manual_progress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Progress (0–100)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Objective"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
