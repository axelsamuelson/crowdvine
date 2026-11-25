import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import sv from "@/messages/sv.json";

type Tree = { [key: string]: string | Tree };

const ROOTS = ["app", "components", "lib"];

function lookup(tree: Tree, dotted: string): string | undefined {
  let cur: string | Tree = tree;
  for (const part of dotted.split(".")) {
    if (typeof cur !== "object" || cur == null || !(part in cur)) return undefined;
    cur = cur[part]!;
  }
  return typeof cur === "string" ? cur : undefined;
}

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const path = join(dir, name);
    if (name.endsWith(".test.ts") || name.endsWith(".test.tsx")) continue;
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(path);
  }
}

function callBodies(src: string, fn: string): string[] {
  const re = new RegExp(`\\b${fn}\\s*\\(`, "g");
  const bodies: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    const open = match.index + match[0].length - 1;
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      const ch = src[i];
      if (ch === "(") depth += 1;
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) {
          bodies.push(src.slice(open + 1, i));
          break;
        }
      }
    }
  }
  return bodies;
}

function stringLiterals(src: string): string[] {
  return [...src.matchAll(/"([^"\\]*)"|'([^'\\]*)'/g)].map(
    (m) => m[1] ?? m[2] ?? "",
  );
}

/**
 * Message keys rendered without a `datum` argument.
 * A literal `{datum}` in those strings would show up on screen.
 */
function keysRenderedWithoutDatum(): Map<string, string[]> {
  const files: string[] = [];
  for (const root of ROOTS) walk(root, files);
  const found = new Map<string, string[]>();

  const note = (key: string, file: string) => {
    const prev = found.get(key) ?? [];
    prev.push(file);
    found.set(key, prev);
  };

  for (const file of files) {
    const src = readFileSync(file, "utf8");

    for (const body of callBodies(src, "t")) {
      if (/\bdatum\b/.test(body)) continue;
      const key = stringLiterals(body)[0];
      if (key && key.includes(".")) note(key, file);
    }

    for (const body of callBodies(src, "translate")) {
      if (/\bdatum\b/.test(body)) continue;
      for (const lit of stringLiterals(body)) {
        if (lit.includes(".")) note(lit, file);
      }
    }

    for (const body of callBodies(src, "dualOfferMsg")) {
      if (/\bdatum\b/.test(body)) continue;
      for (const lit of stringLiterals(body)) {
        if (lit === "sv" || lit === "en") continue;
        note(`checkout.${lit}`, file);
      }
    }
  }

  return found;
}

describe("shared-pallet copy rendered without a date", () => {
  it("does not leave a {datum} placeholder in sv or en", () => {
    const rendered = keysRenderedWithoutDatum();
    const leaks: string[] = [];
    for (const [key, files] of rendered) {
      for (const [locale, tree] of [
        ["sv", sv],
        ["en", en],
      ] as const) {
        const text = lookup(tree as Tree, key);
        if (text?.includes("{datum}")) {
          leaks.push(`${locale} ${key} (${files[0]})`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });
});
