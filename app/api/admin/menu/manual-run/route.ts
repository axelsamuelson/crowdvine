import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { createMenuManualRun, getMenuManualRunById } from "@/lib/menu-extraction/db";
import { runManualMenuPipeline } from "@/lib/menu-extraction/manual-run-orchestrator";

export const maxDuration = 120;

/**
 * POST /api/admin/menu/manual-run
 * Body: { slug: string, city?: string, dryRun?: boolean }
 * Creates a run record, executes pipeline inline, returns runId + status + documentId.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const slug = typeof body.slug === "string" ? body.slug.trim() : undefined;
    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }
    const city = typeof body.city === "string" ? body.city.trim() || "stockholm" : "stockholm";
    const dryRun = Boolean(body.dryRun);

    const run = await createMenuManualRun({ slug, city });
    const result = await runManualMenuPipeline({
      slug,
      city,
      dryRun,
      runId: run.id,
    });

    const updated = await getMenuManualRunById(run.id);
    return NextResponse.json({
      runId: run.id,
      status: result.status,
      documentId: result.documentId,
      errorMessage: result.errorMessage,
      run: updated ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
