/**
 * Character-for-character check: publishable excerpts from Axel's approved
 * direct-delivery addendum must appear verbatim in kopvillkor.sv.md, and
 * key phrases must appear in the rendered kopvillkor.tsx.
 *
 * Usage:
 *   pnpm exec tsx scripts/verify-kopvillkor-direkt-source.ts [approved.md]
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_SHA256 =
  "578afd136248ed76e31f77ed357990d6c5b80d735e116def620304b562bb9620";

/** Instruction headings in the approved file → body that must be published. */
const SECTIONS: { id: string; heading: string; nextHeading?: string }[] = [
  {
    id: "punkt-3-intro",
    heading:
      '## Punkt 3. Två sätt att köpa (nytt inledande stycke, före "Så fungerar en pall")',
    nextHeading: "## Punkt 3 b. Direktleverans (ny underpunkt)",
  },
  {
    id: "punkt-3b",
    heading: "## Punkt 3 b. Direktleverans (ny underpunkt)",
    nextHeading:
      "## Punkt 3 c. Lådor om 6 flaskor (ny underpunkt, gäller båda leveranssätten)",
  },
  {
    id: "punkt-3c",
    heading:
      "## Punkt 3 c. Lådor om 6 flaskor (ny underpunkt, gäller båda leveranssätten)",
    nextHeading:
      '## Punkt 3, "Om en producent inte kan leverera" (ersätter den oförändrade texten)',
  },
  {
    id: "om-producent",
    heading:
      '## Punkt 3, "Om en producent inte kan leverera" (ersätter den oförändrade texten)',
    nextHeading: "## Punkt 4. Priser (lägg till en punkt)",
  },
  {
    id: "punkt-4",
    heading: "## Punkt 4. Priser (lägg till en punkt)",
    nextHeading: "## Punkt 5. Betalning (lägg till efter första stycket)",
  },
  {
    id: "punkt-5",
    heading: "## Punkt 5. Betalning (lägg till efter första stycket)",
    nextHeading: "## Punkt 7. Leverans (komplettera)",
  },
  {
    id: "punkt-7-body",
    heading: "## Punkt 7. Leverans (komplettera)",
    nextHeading: undefined,
  },
];

function normalizeNewlines(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

function extractBody(publishable: string, heading: string, next?: string): string {
  const start = publishable.indexOf(heading);
  if (start < 0) throw new Error(`Missing heading: ${heading}`);
  const afterHeading = publishable.slice(start + heading.length);
  const end = next ? afterHeading.indexOf(next) : afterHeading.length;
  if (next && end < 0) throw new Error(`Missing next heading: ${next}`);
  let body = afterHeading.slice(0, end).trim();
  // Strip trailing markdown horizontal rules left before Anmärkningar.
  body = body.replace(/\n---+\s*$/g, "").trim();
  // Punkt 7 file includes instruction "Ersätt raden om 2–3 veckor med:" — only the bullets are published.
  if (heading.startsWith("## Punkt 7.")) {
    const bulletStart = body.indexOf("- **Delad pall:**");
    if (bulletStart < 0) throw new Error("Punkt 7 bullets not found in approved file");
    body = body.slice(bulletStart).trim();
  }
  return body;
}

function main() {
  const approvedPath = resolve(
    process.argv[2] ??
      "/home/ubuntu/.cursor/projects/agent-repos-crowdvine/uploads/kopvillkor-direktleverans-tillagg-GODKAND-2026-11-11-1122_572f.md",
  );
  const publishedPath = resolve("content/legal/source/kopvillkor.sv.md");
  const tsxPath = resolve("content/legal/kopvillkor.tsx");

  const approvedRaw = normalizeNewlines(readFileSync(approvedPath, "utf8"));
  const hash = createHash("sha256").update(approvedRaw).digest("hex");
  if (hash !== EXPECTED_SHA256) {
    console.error(`SHA-256 mismatch:\n  got  ${hash}\n  want ${EXPECTED_SHA256}`);
    process.exit(1);
  }
  console.log(`OK sha256 ${hash}`);

  const notesIdx = approvedRaw.indexOf("## Anmärkningar (ej publicerad text)");
  if (notesIdx < 0) {
    console.error("Missing Anmärkningar marker in approved file");
    process.exit(1);
  }
  const publishable = approvedRaw.slice(0, notesIdx);

  const published = normalizeNewlines(readFileSync(publishedPath, "utf8"));
  const tsxFlat = normalizeNewlines(readFileSync(tsxPath, "utf8"))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  let failed = 0;
  for (const section of SECTIONS) {
    let body: string;
    try {
      body = extractBody(publishable, section.heading, section.nextHeading);
    } catch (e) {
      console.error(`FAIL ${section.id}: ${e instanceof Error ? e.message : e}`);
      failed += 1;
      continue;
    }

    if (!published.includes(body)) {
      console.error(
        `FAIL ${section.id}: approved body not found character-for-character in kopvillkor.sv.md (${body.length} chars)`,
      );
      console.error("--- approved body ---");
      console.error(body);
      console.error("---");
      failed += 1;
      continue;
    }

    const plain = body.replace(/\*\*/g, "").replace(/^-\s*/gm, "");
    const probe = plain
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 24)[0];
    if (probe && !tsxFlat.includes(probe.replace(/\s+/g, " "))) {
      console.error(
        `FAIL ${section.id}: key phrase missing from kopvillkor.tsx: ${probe.slice(0, 80)}`,
      );
      failed += 1;
      continue;
    }

    console.log(`OK ${section.id} (${body.length} chars verbatim in .sv.md)`);
  }

  if (failed) {
    console.error(`\n${failed} section(s) failed`);
    process.exit(1);
  }
  console.log(
    "\nAll approved publishable sections match content/legal/source/kopvillkor.sv.md character-for-character.",
  );
}

main();
