import { NextRequest, NextResponse } from "next/server"
import { runScheduledWeeklyOperationsDigest } from "@/lib/operations-weekly-digest"

/**
 * Veckovis e-post med Operations-sammanfattning till alla admins.
 * Aktiveras under /admin/operations/objectives/settings.
 *
 * Vercel cron: varje timme på söndagar (UTC); körning sker bara när klockan är
 * söndag 12:00–12:14 i Europe/Stockholm (se lib/operations-weekly-digest.ts).
 *
 * Säkerhet: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runScheduledWeeklyOperationsDigest()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[cron/operations-weekly-digest]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
