/**
 * Backfill missing contribution economics snapshots on fill-eligible reservation items.
 *
 * Usage:
 *   pnpm exec tsx scripts/backfill-economics-snapshots.ts [--dry-run] [palletId]
 */
import { backfillMissingReservationEconomicsSnapshots } from "../lib/backfill-reservation-economics-snapshots";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const palletId =
    args.find((a) => !a.startsWith("--")) ??
    "3985cbfe-178f-4fa1-a897-17183a1f18db";

  const result = await backfillMissingReservationEconomicsSnapshots({
    palletId,
    dryRun,
  });

  console.log(JSON.stringify({ dryRun, ...result }, null, 2));
  if (result.errors.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
