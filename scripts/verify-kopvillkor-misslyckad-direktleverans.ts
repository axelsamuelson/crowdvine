/**
 * Character-for-character check: expected 2026-11-13 publishable excerpts
 * (embedded in lib/legal/kopvillkor-2026-11-13-amendment.ts) must appear
 * verbatim in SV/EN source markdown and rendered TSX.
 *
 * Usage:
 *   pnpm exec tsx scripts/verify-kopvillkor-misslyckad-direktleverans.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EN_AGE_CHECK_NEW,
  EN_FAILED_HANDOVER,
  EN_TRANSPORT_P1_NEW,
  EN_TRANSPORT_P2_NEW,
  SV_AGE_CHECK_NEW,
  SV_FAILED_HANDOVER,
  SV_TRANSPORT_P1_NEW,
  SV_TRANSPORT_P2_NEW,
} from "../lib/legal/kopvillkor-2026-11-13-amendment";

function normalizeNewlines(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

function main() {
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
      id: "sv-transport-p1",
      path: "content/legal/source/kopvillkor.sv.md",
      excerpt: SV_TRANSPORT_P1_NEW,
    },
    {
      id: "sv-transport-p2",
      path: "content/legal/source/kopvillkor.sv.md",
      excerpt: SV_TRANSPORT_P2_NEW,
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
      id: "en-transport-p1",
      path: "content/legal/source/kopvillkor.en.md",
      excerpt: EN_TRANSPORT_P1_NEW,
    },
    {
      id: "en-transport-p2",
      path: "content/legal/source/kopvillkor.en.md",
      excerpt: EN_TRANSPORT_P2_NEW,
    },
  ];

  let failed = 0;
  for (const check of checks) {
    const published = normalizeNewlines(
      readFileSync(resolve(check.path), "utf8"),
    );
    if (!published.includes(check.excerpt)) {
      console.error(`FAIL ${check.id}: missing in ${check.path}`);
      failed += 1;
      continue;
    }
    console.log(`OK ${check.id} in ${check.path}`);
  }

  const svMd = normalizeNewlines(
    readFileSync(resolve("content/legal/source/kopvillkor.sv.md"), "utf8"),
  );
  const enMd = normalizeNewlines(
    readFileSync(resolve("content/legal/source/kopvillkor.en.md"), "utf8"),
  );
  if (
    svMd.includes(
      `${SV_TRANSPORT_P1_NEW} För direktleverans gäller punkt 3 b.`,
    )
  ) {
    console.error("FAIL sv-placement: 3 b trailer still on paragraph 1");
    failed += 1;
  } else {
    console.log("OK sv-placement (3 b trailer on paragraph 2)");
  }
  if (
    enMd.includes(
      `${EN_TRANSPORT_P1_NEW} For direct delivery, point 3 b applies.`,
    )
  ) {
    console.error("FAIL en-placement: 3 b trailer still on paragraph 1");
    failed += 1;
  } else {
    console.log("OK en-placement (3 b trailer on paragraph 2)");
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
    ["tsx-sv-transport-p1", svFlat, "Vid delad pall: Om du inte är hemma"],
    [
      "tsx-sv-transport-p2",
      svFlat,
      "tar vi inte ut någon avgift. För direktleverans gäller",
    ],
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
      "tsx-en-transport-p1",
      enFlat,
      "For shared pallets: If you are not at home",
    ],
    [
      "tsx-en-transport-p2",
      enFlat,
      "we do not charge any fee. For direct delivery, point 3 b applies.",
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
