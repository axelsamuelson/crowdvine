/**
 * Import Savant Bar bottle list from flasklista.savantbar.se into Supabase.
 *
 * Usage:
 *   pnpm import:savantbar
 *   pnpm import:savantbar --force
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.development") });

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    const { prepareSavantbarSnapshot, savantbarSourceUpdatedAt } = await import(
      "@/lib/menu-extraction/savantbar-schema"
    );
    const { prepareSavantbarVinRecord } = await import("@/lib/menu-extraction/savantbar-schema");
    const { fetchSavantbarSnapshot } = await import("@/lib/menu-extraction/savantbar-scraper");

    console.warn("[import-savantbar] DRY RUN — no DB writes");

    // Prove unknown-field logging against a synthetic record
    prepareSavantbarVinRecord({
      id: "recDRYRUN_PROBE",
      createdTime: new Date().toISOString(),
      fields: { Name: "Probe", __synthetic_unknown__: "drop-me" },
    });

    const raw = await fetchSavantbarSnapshot();
    const prepared = prepareSavantbarSnapshot(raw);
    const withLastUpdated = prepared.wines.find((w) => w.fields["Last Updated"]);
    console.log(
      JSON.stringify(
        {
          prepare_stats: prepared.prepare_stats,
          sample_source_updated_at: withLastUpdated
            ? savantbarSourceUpdatedAt(withLastUpdated.fields)
            : null,
        },
        null,
        2,
      ),
    );
    return;
  }

  const { importSavantbarBottleList } = await import("@/lib/menu-extraction/savantbar-import");

  console.warn("[import-savantbar] Starting import", { force });
  const result = await importSavantbarBottleList({ force });
  console.log(JSON.stringify(result, null, 2));

  if (result.skipped && result.skip_reason === "unchanged") {
    console.warn("[import-savantbar] Snapshot unchanged – no new import");
  } else {
    console.warn(
      `[import-savantbar] Imported ${result.row_count} rows in ${result.section_count} sections`,
    );
  }
}

main().catch((err) => {
  console.error("[import-savantbar] Failed:", err);
  process.exit(1);
});
