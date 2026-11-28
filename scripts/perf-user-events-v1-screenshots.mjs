/**
 * Visual evidence that PLP / PDP look unchanged after RPC aggregates.
 * artifacts/perf-user-events/v1/ — never commit.
 *
 * TEST only — msdfjrrokcmjifetuwgc. Guest / no login. No auth emails. No prod.
 *
 * APP_URL=http://127.0.0.1:3000 node scripts/perf-user-events-v1-screenshots.mjs
 */
import { chromium } from "playwright";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { execSync } from "node:child_process";

const BASE = process.env.APP_URL || "http://127.0.0.1:3000";
const PDP_PATH =
  process.env.PERF_PDP_PATH || "/produkt/up-tempo-2024";
const PLP_PATH = process.env.PERF_PLP_PATH || "/vin";
const OUT_REPO = join(process.cwd(), "artifacts", "perf-user-events", "v1");
const OUT_OPT = "/opt/cursor/artifacts/perf-user-events/v1";
const OUT_WALK = "/opt/cursor/artifacts";
for (const d of [OUT_REPO, OUT_OPT]) mkdirSync(d, { recursive: true });

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const BRANCH = execSync("git rev-parse --abbrev-ref HEAD", {
  encoding: "utf8",
}).trim();

/** @type {Array<Record<string, unknown>>} */
const manifestRows = [];

function requireTestEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url.includes("msdfjrrokcmjifetuwgc")) {
    throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not TEST");
  }
}

async function shot(page, name, meta) {
  const captured_at = new Date().toISOString();
  await page.waitForTimeout(500);
  for (const dir of [OUT_REPO, OUT_OPT]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, fullPage: false });
  }
  const walk = join(OUT_WALK, `perf_user_events_${name}`);
  if (existsSync(walk)) unlinkSync(walk);
  await page.screenshot({ path: walk, fullPage: false });
  const buf = readFileSync(join(OUT_REPO, name));
  const md5 = createHash("md5").update(buf).digest("hex");
  manifestRows.push({
    file: name,
    md5,
    bytes: buf.length,
    captured_at,
    head_sha: HEAD,
    branch: BRANCH,
    ...meta,
  });
  console.log("wrote", name, md5);
}

async function main() {
  requireTestEnv();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1440]) {
      const height = width === 390 ? 844 : 900;
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      await page.goto(`${BASE}${PLP_PATH}`, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
      await shot(page, `plp-vin-${width}.png`, {
        route: PLP_PATH,
        viewport: { width, height },
        page: "plp",
      });

      await page.goto(`${BASE}${PDP_PATH}`, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
      await shot(page, `pdp-${width}.png`, {
        route: PDP_PATH,
        viewport: { width, height },
        page: "pdp",
      });

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    head_sha: HEAD,
    branch: BRANCH,
    captured_at: new Date().toISOString(),
    supabase_ref: "msdfjrrokcmjifetuwgc",
    note: "Guest screenshots of /vin PLP and a synthetic PDP; no login. Visual baseline after RPC aggregates.",
    files: manifestRows,
  };
  for (const dir of [OUT_REPO, OUT_OPT]) {
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  }
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
