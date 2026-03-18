import { NextRequest, NextResponse } from "next/server"
import { getTasksForEntity } from "@/lib/actions/operations-entity"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentAdmin } from "@/lib/admin-auth-server"

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const entity_type = searchParams.get("entity_type")
  const entity_id = searchParams.get("entity_id")

  if (!entity_type || !entity_id) {
    return NextResponse.json(
      { error: "entity_type and entity_id are required" },
      { status: 400 }
    )
  }

  try {
    const sb = getSupabaseAdmin()

    const [tasks, projectsRes, objectivesRes, adminsRes] = await Promise.all([
      getTasksForEntity(entity_type, entity_id),
      sb
        .from("admin_projects")
        .select("id, name")
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name"),
      sb
        .from("admin_objectives")
        .select("id, title")
        .is("deleted_at", null)
        .eq("status", "active")
        .order("title"),
      sb
        .from("profiles")
        .select("id, email")
        .eq("role", "admin")
        .order("email"),
    ])

    return NextResponse.json({
      tasks,
      projects: projectsRes.data ?? [],
      objectives: objectivesRes.data ?? [],
      admins: adminsRes.data ?? [],
    })
  } catch (err) {
    console.error("entity-tasks:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch" },
      { status: 500 }
    )
  }
}
