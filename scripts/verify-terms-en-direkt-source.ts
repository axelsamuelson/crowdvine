/**
 * Character-for-character check: publishable excerpts from the approved
 * English direct-delivery addendum must appear verbatim in kopvillkor.en.md.
 *
 * Usage:
 *   pnpm exec tsx scripts/verify-terms-en-direkt-source.ts [approved.md]
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_SHA256 =
  "1b9dfe864c9c52ec581290192b48bd89d97ce32e019ad8cbb4d368d9db169914";

const SECTIONS: { id: string; heading: string; nextHeading?: string }[] = [
  {
    id: "section-3-intro",
    heading:
      '## Section 3. Two ways to buy (new opening paragraph, before "How a shared pallet works")',
    nextHeading: "## Section 3 b. Direct delivery (new subsection)",
  },
  {
    id: "section-3b",
    heading: "## Section 3 b. Direct delivery (new subsection)",
    nextHeading:
      "## Section 3 c. Boxes of 6 bottles (new subsection, applies to both delivery methods)",
  },
  {
    id: "section-3c",
    heading:
      "## Section 3 c. Boxes of 6 bottles (new subsection, applies to both delivery methods)",
    nextHeading:
      '## Section 3, "If a producer cannot deliver" (replaces the unchanged text)',
  },
  {
    id: "if-producer",
    heading:
      '## Section 3, "If a producer cannot deliver" (replaces the unchanged text)',
    nextHeading: "## Section 4. Prices (add a bullet)",
  },
  {
    id: "section-4",
    heading: "## Section 4. Prices (add a bullet)",
    nextHeading: "## Section 5. Payment (add after the first paragraph)",
  },
  {
    id: "section-5",
    heading: "## Section 5. Payment (add after the first paragraph)",
    nextHeading: "## Section 7. Delivery (supplement)",
  },
  {
    id: "section-7-body",
    heading: "## Section 7. Delivery (supplement)",
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
  body = body.replace(/\n---+\s*$/g, "").trim();
  if (heading.startsWith("## Section 7.")) {
    const bulletStart = body.indexOf("- **Shared pallet:**");
    if (bulletStart < 0) throw new Error("Section 7 bullets not found");
    body = body.slice(bulletStart).trim();
  }
  return body;
}

function resolveApprovedPath(): string | null {
  const arg = process.argv[2];
  if (arg) return resolve(arg);
  const candidates = [
    "/home/ubuntu/.cursor/projects/agent-repos-crowdvine/uploads/terms-en-direktleverans-tillagg-GODKAND-2026-11-11-1241_b437.md",
    "uploads/terms-en-direktleverans-tillagg-GODKAND-2026-11-11-1241.md",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return resolve(p);
  }
  return null;
}

function main() {
  const approvedPath = resolveApprovedPath();
  if (!approvedPath) {
    console.log(
      "SKIP: approved EN terms direkt addendum not found locally (pass a path as argv to verify).",
    );
    return;
  }
  const publishedPath = resolve("content/legal/source/kopvillkor.en.md");
  const tsxPath = resolve("content/legal/kopvillkor-en.tsx");

  const approvedRaw = normalizeNewlines(readFileSync(approvedPath, "utf8"));
  const hash = createHash("sha256").update(approvedRaw).digest("hex");
  if (hash !== EXPECTED_SHA256) {
    console.error(`SHA-256 mismatch:\n  got  ${hash}\n  want ${EXPECTED_SHA256}`);
    process.exit(1);
  }
  console.log(`OK sha256 ${hash}`);

  const hrIdx = approvedRaw.indexOf("\n---\n");
  if (hrIdx < 0) {
    console.error("Missing --- marker in approved file");
    process.exit(1);
  }
  const publishable = approvedRaw.slice(hrIdx + 5);

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
        `FAIL ${section.id}: approved body not found character-for-character in kopvillkor.en.md (${body.length} chars)`,
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
        `FAIL ${section.id}: key phrase missing from kopvillkor-en.tsx: ${probe.slice(0, 80)}`,
      );
      failed += 1;
      continue;
    }

    console.log(`OK ${section.id} (${body.length} chars verbatim in .en.md)`);
  }

  if (failed) {
    console.error(`\n${failed} section(s) failed`);
    process.exit(1);
  }
  console.log(
    "\nAll approved publishable sections match content/legal/source/kopvillkor.en.md character-for-character.",
  );
}

main();
