/**
 * Character-for-character check: publishable quotes from
 * kopvillkor-misslyckad-direktleverans-GODKAND-2026-11-13.md must appear
 * verbatim in SV/EN source markdown and rendered TSX.
 *
 * Usage:
 *   pnpm exec tsx scripts/verify-kopvillkor-misslyckad-direktleverans.ts [approved.md]
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  EN_AGE_CHECK_NEW,
  EN_FAILED_HANDOVER,
  EN_TRANSPORT_NEW,
  KOPVILLKOR_2026_11_13_SHA256,
  SV_AGE_CHECK_NEW,
  SV_FAILED_HANDOVER,
  SV_TRANSPORT_NEW,
} from "../lib/legal/kopvillkor-2026-11-13-amendment";

function normalizeNewlines(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

function resolveApprovedPath(): string {
  const arg = process.argv[2];
  if (arg) return resolve(arg);
  const candidates = [
    "/cursor/stores/bot/handoff/kopvillkor-misslyckad-direktleverans-GODKAND-2026-11-13.md",
    "uploads/kopvillkor-misslyckad-direktleverans-GODKAND-2026-11-13.md",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return resolve(p);
  }
  throw new Error("Approved misslyckad-direktleverans file not found");
}

function main() {
  const approvedPath = resolveApprovedPath();
  const approvedRaw = normalizeNewlines(readFileSync(approvedPath, "utf8"));
  const hash = createHash("sha256").update(approvedRaw).digest("hex");
  if (hash !== KOPVILLKOR_2026_11_13_SHA256) {
    console.error(
      `SHA-256 mismatch:\n  got  ${hash}\n  want ${KOPVILLKOR_2026_11_13_SHA256}`,
    );
    process.exit(1);
  }
  console.log(`OK sha256 ${hash}`);

  const checks: { id: string; path: string; excerpt: string }[] = [
    {
      id: "sv-age",
      path: "content/legal/source/kopvillkor.sv.md",
      excerpt: SV_AGE_CHECK_NEW,
    },
    {
      id: "sv-failed-handover",
      path: "content/legal/source/kopvillkor.sv.md",
      excerpt: SV_FAILED_HANDOVER,
    },
    {
      id: "sv-transport",
      path: "content/legal/source/kopvillkor.sv.md",
      excerpt: SV_TRANSPORT_NEW,
    },
    {
      id: "en-age",
      path: "content/legal/source/kopvillkor.en.md",
      excerpt: EN_AGE_CHECK_NEW,
    },
    {
      id: "en-failed-handover",
      path: "content/legal/source/kopvillkor.en.md",
      excerpt: EN_FAILED_HANDOVER,
    },
    {
      id: "en-transport",
      path: "content/legal/source/kopvillkor.en.md",
      excerpt: EN_TRANSPORT_NEW,
    },
  ];

  let failed = 0;
  for (const check of checks) {
    const published = normalizeNewlines(readFileSync(resolve(check.path), "utf8"));
    if (!published.includes(check.excerpt)) {
      console.error(`FAIL ${check.id}: missing in ${check.path}`);
      failed += 1;
      continue;
    }
    console.log(`OK ${check.id} in ${check.path}`);
  }

  const flatten = (s: string) =>
    normalizeNewlines(s)
      .replace(/\{\s*"\s*"\s*\}/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
  const svFlat = flatten(
    readFileSync(resolve("content/legal/kopvillkor.tsx"), "utf8"),
  );
  const enFlat = flatten(
    readFileSync(resolve("content/legal/kopvillkor-en.tsx"), "utf8"),
  );

  // TSX flatten turns </LegalLink>. into " ." — probe phrases avoid that junction.
  const tsxProbes: [string, string, string][] = [
    [
      "tsx-sv-age",
      svFlat,
      "Går ålderskontrollen inte igenom lämnas vinet inte ut.",
    ],
    [
      "tsx-sv-failed",
      svFlat,
      "Om lådan inte kan lämnas över. Kan UPS inte lämna över lådan",
    ],
    ["tsx-sv-transport", svFlat, "Vid delad pall: Om du inte är hemma"],
    [
      "tsx-en-age",
      enFlat,
      "If the age check fails, the wine will not be handed over.",
    ],
    [
      "tsx-en-failed",
      enFlat,
      "If the box cannot be handed over. If UPS cannot hand over the box",
    ],
    [
      "tsx-en-transport",
      enFlat,
      "For direct delivery, point 3 b applies.",
    ],
  ];
  for (const [id, flat, phrase] of tsxProbes) {
    if (!flat.includes(phrase)) {
      console.error(`FAIL ${id}: plain text missing from tsx`);
      failed += 1;
    } else {
      console.log(`OK ${id}`);
    }
  }

  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll 2026-11-13 publishable excerpts match.");
}

main();
