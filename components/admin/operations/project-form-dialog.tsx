"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createProject, updateProject } from "@/lib/actions/operations"
import type {
  Project,
  ObjectiveMin,
  AdminUserMin,
  KeyResultPickerOption,
} from "@/lib/types/operations"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["planned", "active", "on_hold", "completed", "archived"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  objective_id: z.string().nullable().optional(),
  key_result_id: z.string().nullable().optional(),
  owner_id: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
  defaultObjectiveId?: string | null
  /** Key results grouped by objective; used to link the project to a KR. */
  keyResultOptions?: KeyResultPickerOption[]
  /** Called after a successful create (not on edit). */
  onCreated?: (project: Project) => void | Promise<void>
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  objectives,
  admins,
  defaultObjectiveId,
  keyResultOptions = [],
  onCreated,
}: Props) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!project

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
      priority: "medium",
      objective_id: defaultObjectiveId ?? null,
      key_result_id: null,
      owner_id: null,
      start_date: null,
      due_date: null,
    },
  })

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description ?? "",
        status: project.status,
        priority: project.priority,
        objective_id: project.objective_id ?? null,
        key_result_id: project.key_result_id ?? null,
        owner_id: project.owner_id ?? null,
        start_date: project.start_date ?? null,
        due_date: project.due_date ?? null,
      })
    } else {
      form.reset({
        name: "",
        description: "",
        status: "active",
        priority: "medium",
        objective_id: defaultObjectiveId ?? null,
        key_result_id: null,
        owner_id: null,
        start_date: null,
        due_date: null,
      })
    }
  }, [project, open, defaultObjectiveId])

  const objectiveId = form.watch("objective_id")
  const keyResultId = form.watch("key_result_id")

  const keyResultsForObjective = useMemo(
    () =>
      objectiveId
        ? keyResultOptions.filter((k) => k.objective_id === objectiveId)
        : [],
    [keyResultOptions, objectiveId]
  )

  useEffect(() => {
    if (!objectiveId) {
      if (keyResultId) form.setValue("key_result_id", null)
      return
    }
    const allowed = keyResultOptions
      .filter((k) => k.objective_id === objectiveId)
      .map((k) => k.id)
    if (keyResultId && !allowed.includes(keyResultId)) {
      form.setValue("key_result_id", null)
    }
  }, [objectiveId, keyResultId, keyResultOptions, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      if (isEdit && project) {
        await updateProject(project.id, values)
        toast.success("Project updated")
      } else {
        const created = await createProject(values)
        await Promise.resolve(onCreated?.(created))
        if (!onCreated) {
          toast.success("Project created")
        }
      }
      onOpenChange(false)
      form.reset()
    } catch {
      toast.error(
        isEdit ? "Failed to update project" : "Failed to create project"
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
            {isEdit ? "Edit Project" : "Create Project"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Project name" {...field} />
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
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
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
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="objective_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objective</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v === "__none__" ? null : v)
                        form.setValue("key_result_id", null)
                      }}
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No objective" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No objective</SelectItem>
                        {objectives.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.title}
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
              name="key_result_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key result</FormLabel>
                  {!objectiveId ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 py-1">
                      Select an objective to link a key result.
                    </p>
                  ) : keyResultsForObjective.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 py-1">
                      This objective has no key results yet.
                    </p>
                  ) : (
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {keyResultsForObjective.map((k) => (
                          <SelectItem key={k.id} value={k.id}>
                            {k.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {objectiveId &&
              keyResultsForObjective.length > 0 &&
              !keyResultId && (
                <Alert className="border-blue-200 bg-blue-50/80 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100">
                  <AlertDescription className="text-xs leading-relaxed">
                    Linking this project to a key result makes it clear which
                    measurable outcome the work supports.
                  </AlertDescription>
                </Alert>
              )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
