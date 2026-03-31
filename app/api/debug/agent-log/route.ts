import { NextRequest, NextResponse } from "next/server"
import { appendFileSync, mkdirSync } from "node:fs"
import path from "node:path"

/** NDJSON append for agent debug session (mobile hits Next on host → file on disk). */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  try {
    const payload = (await req.json()) as Record<string, unknown>
    const line =
      JSON.stringify({
        ...payload,
        serverReceivedAt: Date.now(),
      }) + "\n"

    const dir = path.join(process.cwd(), ".cursor")
    mkdirSync(dir, { recursive: true })
    const file = path.join(dir, "debug-aae6fd.log")
    appendFileSync(file, line, "utf8")

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
