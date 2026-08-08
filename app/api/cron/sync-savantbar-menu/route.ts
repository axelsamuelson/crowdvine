import { NextRequest, NextResponse } from "next/server";
import { menuCronGate } from "@/lib/menu-extraction/cron-auth";
import { importSavantbarBottleList } from "@/lib/menu-extraction/savantbar-import";
import {
  formatSavantbarDiffSummary,
  type SavantbarSnapshotDiff,
} from "@/lib/menu-extraction/savantbar-diff";
import { sendMenuPipelineAlert } from "@/lib/menu-extraction/pipeline-alert-transport";

export const maxDuration = 300;

function summarizeDiff(diff: SavantbarSnapshotDiff | undefined) {
  if (!diff) {
    return { added: 0, removed: 0, price_changes: 0, has_changes: false };
  }
  return {
    added: diff.added.length,
    removed: diff.removed.length,
    price_changes: diff.priceChanges.length,
    has_changes: diff.hasChanges,
  };
}

/**
 * Cron: daily Savant Bar Systemless menu sync (flasklista.savantbar.se).
 * Content-hash gate skips unchanged snapshots; diff runs before new doc write.
 * Schedule: 0 5 * * * (UTC)
 */
export async function GET(request: NextRequest) {
  const gated = await menuCronGate(request);
  if (gated) return gated;

  try {
    const result = await importSavantbarBottleList();
    const diffSummary = summarizeDiff(result.diff);

    const payload = {
      ok: true,
      skipped: result.skipped,
      skip_reason: result.skip_reason ?? null,
      document_id: result.document_id ?? null,
      content_hash: result.content_hash,
      wine_count: result.wine_count,
      other_count: result.other_count,
      row_count: result.row_count,
      section_count: result.section_count,
      diff: diffSummary,
      diff_detail: result.diff ?? null,
    };

    console.warn("[cron/sync-savantbar-menu] Summary:", payload);

    if (!result.skipped && result.diff?.hasChanges) {
      const lines = [
        formatSavantbarDiffSummary(result.diff),
        `document_id: ${result.document_id ?? "—"}`,
        `rows imported: ${result.row_count}`,
      ];
      if (result.diff.added.length > 0) {
        lines.push(
          `Added: ${result.diff.added
            .slice(0, 10)
            .map((e) => `${e.producer ?? "?"} – ${e.name ?? "?"} (${e.price ?? "?"})`)
            .join("; ")}${result.diff.added.length > 10 ? " …" : ""}`,
        );
      }
      if (result.diff.removed.length > 0) {
        lines.push(
          `Removed: ${result.diff.removed
            .slice(0, 10)
            .map((e) => `${e.producer ?? "?"} – ${e.name ?? "?"}`)
            .join("; ")}${result.diff.removed.length > 10 ? " …" : ""}`,
        );
      }
      if (result.diff.priceChanges.length > 0) {
        lines.push(
          `Price changes: ${result.diff.priceChanges
            .slice(0, 10)
            .map(
              (e) =>
                `${e.producer ?? "?"} – ${e.name ?? "?"}: ${e.old_price ?? "?"} → ${e.new_price ?? "?"}`,
            )
            .join("; ")}${result.diff.priceChanges.length > 10 ? " …" : ""}`,
        );
      }
      await sendMenuPipelineAlert("[Savantbar sync] Menu changes detected", lines);
    }

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/sync-savantbar-menu] Error:", message);
    await sendMenuPipelineAlert("[Savantbar sync] Cron failed", [message]);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
