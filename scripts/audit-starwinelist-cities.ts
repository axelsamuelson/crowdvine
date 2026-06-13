/**
 * Audit Starwinelist sources: read actual city from each venue page and update DB.
 * Run: pnpm exec tsx scripts/audit-starwinelist-cities.ts [--apply] [--scope stockholm]
 *
 * Without --apply: dry-run report only.
 * With --scope stockholm: mark non-Stockholm sources as crawl_status=skipped.
 */
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.development") });

async function main() {
  const apply = process.argv.includes("--apply");
  const scopeIdx = process.argv.indexOf("--scope");
  const scope =
    scopeIdx >= 0 && process.argv[scopeIdx + 1]
      ? process.argv[scopeIdx + 1]!.toLowerCase()
      : null;

  const { listStarwinelistSources, updateStarwinelistSource } = await import(
    "@/lib/menu-extraction/db"
  );
  const { fetchRestaurantPage } = await import(
    "@/lib/menu-extraction/starwinelist-scraper"
  );
  const { normalizeSwlCitySlug, isWrongCityForScope } = await import(
    "@/lib/menu-extraction/swl-location"
  );

  const sources = await listStarwinelistSources();
  console.log(`Auditing ${sources.length} sources (apply=${apply}, scope=${scope ?? "none"})…\n`);

  let updated = 0;
  let wrongForScope = 0;
  const byCity: Record<string, number> = {};

  for (const source of sources) {
    await new Promise((r) => setTimeout(r, 2000));
    const page = await fetchRestaurantPage(source.slug);
    if (!page) {
      console.log(`  ? ${source.slug} – could not fetch page`);
      continue;
    }

    const actual =
      normalizeSwlCitySlug(page.swl_location?.slug ?? null) ?? source.city;
    byCity[actual] = (byCity[actual] ?? 0) + 1;

    const wrong =
      scope != null &&
      page.swl_location != null &&
      isWrongCityForScope(page.swl_location, scope);

    if (actual !== source.city || wrong) {
      console.log(
        `  ${source.slug}: db=${source.city} → swl=${page.swl_location?.name ?? actual} (${actual})${wrong ? " [OUT OF SCOPE]" : ""}`,
      );
    }

    if (wrong) wrongForScope += 1;

    if (apply && (actual !== source.city || wrong)) {
      await updateStarwinelistSource(source.id, {
        city: actual,
        name: page.name ?? source.name,
        ...(wrong
          ? {
              crawl_status: "skipped" as const,
              last_error: `Restaurangen tillhör ${page.swl_location?.name ?? actual}, inte ${scope}`,
              last_crawled_at: new Date().toISOString(),
            }
          : {}),
      });
      updated += 1;
    }
  }

  console.log("\nCity distribution (from SWL pages):", byCity);
  console.log(`Out of scope (${scope ?? "n/a"}): ${wrongForScope}`);
  if (apply) console.log(`Updated ${updated} row(s) in starwinelist_sources.`);
  else console.log("Dry run – pass --apply to write changes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
