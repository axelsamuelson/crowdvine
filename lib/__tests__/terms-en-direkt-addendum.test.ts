import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_SHA256 =
  "1b9dfe864c9c52ec581290192b48bd89d97ce32e019ad8cbb4d368d9db169914";

const APPROVED_CANDIDATES = [
  resolve(
    "/home/ubuntu/.cursor/projects/agent-repos-crowdvine/uploads/terms-en-direktleverans-tillagg-GODKAND-2026-11-11-1241_b437.md",
  ),
  resolve(
    "uploads/terms-en-direktleverans-tillagg-GODKAND-2026-11-11-1241.md",
  ),
];

function loadApproved(): string {
  for (const p of APPROVED_CANDIDATES) {
    if (existsSync(p)) return readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  }
  throw new Error("Approved EN terms addendum file not found");
}

function extractBody(
  publishable: string,
  heading: string,
  next?: string,
): string {
  const start = publishable.indexOf(heading);
  if (start < 0) throw new Error(`Missing heading: ${heading}`);
  const afterHeading = publishable.slice(start + heading.length);
  const end = next ? afterHeading.indexOf(next) : afterHeading.length;
  if (next && end < 0) throw new Error(`Missing next heading: ${next}`);
  let body = afterHeading.slice(0, end).trim();
  body = body.replace(/\n---+\s*$/g, "").trim();
  if (heading.startsWith("## Section 7.")) {
    const bulletStart = body.indexOf("- **Shared pallet:**");
    if (bulletStart < 0) {
      throw new Error("Section 7 bullets not found in approved file");
    }
    body = body.slice(bulletStart).trim();
  }
  return body;
}

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

describe("EN terms direct-delivery addendum (GODKAND-1241)", () => {
  it("matches approved publishable excerpts character-for-character in .en.md", () => {
    const approved = loadApproved();
    expect(createHash("sha256").update(approved).digest("hex")).toBe(
      EXPECTED_SHA256,
    );

    const hrIdx = approved.indexOf("\n---\n");
    expect(hrIdx).toBeGreaterThan(0);
    const publishable = approved.slice(hrIdx + 5);

    const published = readFileSync(
      resolve("content/legal/source/kopvillkor.en.md"),
      "utf8",
    ).replace(/\r\n/g, "\n");

    for (const section of SECTIONS) {
      const body = extractBody(
        publishable,
        section.heading,
        section.nextHeading,
      );
      expect(
        published.includes(body),
        `${section.id} missing verbatim (${body.length} chars): ${body.slice(0, 60)}`,
      ).toBe(true);
    }
  });

  it("renders numbered 3 b / 3 c headings and linked section 3 b / section 9", () => {
    const tsx = readFileSync(
      resolve("content/legal/kopvillkor-en.tsx"),
      "utf8",
    );
    expect(tsx).toContain('id="punkt-3b"');
    expect(tsx).toContain(">3 b. Direct delivery<");
    expect(tsx).toContain('id="punkt-3c"');
    expect(tsx).toContain(">3 c. Boxes of 6 bottles<");
    expect(tsx).toContain('href="#punkt-3b">section 3 b<');
    expect(tsx).toMatch(/href="#punkt-9">section 9</);
    expect(tsx).toContain(">3. How to buy<");
    expect(tsx).toContain(">How a shared pallet works<");
    expect(tsx.replace(/\s+/g, " ")).toContain(
      "after the pallet closed or, for direct delivery, after the order was confirmed",
    );
  });
});

describe("SV terms approved heading + §7 sentence", () => {
  it("uses 3. Så köper du + Så fungerar en pall subheading and updated 30-day sentence", () => {
    const published = readFileSync(
      resolve("content/legal/source/kopvillkor.sv.md"),
      "utf8",
    );
    expect(published).toContain("## 3. Så köper du");
    expect(published).toContain("### Så fungerar en pall");
    expect(published).toContain(
      "Har du inte fått din leverans inom 30 dagar efter att pallen stängde eller, vid direktleverans, efter att ordern bekräftades, får du avbryta köpet. Du får då tillbaka hela beloppet inom 14 dagar.",
    );

    const tsx = readFileSync(resolve("content/legal/kopvillkor.tsx"), "utf8");
    expect(tsx).toContain(">3. Så köper du<");
    expect(tsx).toContain(">Så fungerar en pall<");
    expect(tsx).toContain(
      "eller, vid direktleverans, efter att ordern bekräftades",
    );
  });
});
