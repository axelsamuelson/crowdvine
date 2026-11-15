"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { DriftCompany } from "@/lib/operations/drift/priority-rules"

export interface InitiativeInput {
  objective_id: string
  company: DriftCompany
  key: string
  title: string
  owner_agent: string
  sort_order: number
  status?: string
}

export async function listInitiativesForObjective(objectiveId: string) {
  await requireAdmin()
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("admin_initiatives")
    .select(
      "id, objective_id, company, key, title, owner_agent, sort_order, status, created_at, updated_at",
    )
    .eq("objective_id", objectiveId)
    .order("sort_order")
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createInitiative(input: InitiativeInput) {
  await requireAdmin()
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("admin_initiatives")
    .insert({
      objective_id: input.objective_id,
      company: input.company,
      key: input.key.trim(),
      title: input.title.trim(),
      owner_agent: input.owner_agent.trim(),
      sort_order: input.sort_order,
      status: input.status ?? "active",
    })
    .select(
      "id, objective_id, company, key, title, owner_agent, sort_order, status",
    )
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/admin/operations")
  revalidatePath("/admin/operations/objectives")
  return data
}

export async function updateInitiative(
  id: string,
  input: Partial<InitiativeInput>,
) {
  await requireAdmin()
  const sb = getSupabaseAdmin()
  const patch: Record<string, unknown> = {}
  if (input.key != null) patch.key = input.key.trim()
  if (input.title != null) patch.title = input.title.trim()
  if (input.owner_agent != null) patch.owner_agent = input.owner_agent.trim()
  if (input.sort_order != null) patch.sort_order = input.sort_order
  if (input.status != null) patch.status = input.status
  if (input.company != null) patch.company = input.company
  if (input.objective_id != null) patch.objective_id = input.objective_id

  const { data, error } = await sb
    .from("admin_initiatives")
    .update(patch)
    .eq("id", id)
    .select(
      "id, objective_id, company, key, title, owner_agent, sort_order, status",
    )
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/admin/operations")
  revalidatePath("/admin/operations/objectives")
  return data
}

export async function reorderInitiatives(
  objectiveId: string,
  orderedIds: string[],
) {
  await requireAdmin()
  const sb = getSupabaseAdmin()
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]!
    const { error } = await sb
      .from("admin_initiatives")
      .update({ sort_order: i + 1 })
      .eq("id", id)
      .eq("objective_id", objectiveId)
    if (error) throw new Error(error.message)
  }
  revalidatePath("/admin/operations")
  revalidatePath("/admin/operations/objectives")
}
