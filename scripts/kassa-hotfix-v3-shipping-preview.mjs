/**
 * Step-1 shipping preview evidence only → Agent Store v3 (never git).
 * node scripts/kassa-hotfix-v3-shipping-preview.mjs
 */
import { chromium, webkit, devices } from "playwright";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  statSync,
  existsSync,
  unlinkSync,
  copyFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { execSync } from "node:child_process";

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const OUT = "/cursor/stores/self/artifacts/kassa-hotfix/v3";
const OPT = "/opt/cursor/artifacts/kassa-hotfix-v3";
mkdirSync(OUT, { recursive: true });
mkdirSync(OPT, { recursive: true });

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const HEAD_CI = execSync("git log -1 --format=%ci", { encoding: "utf8" }).trim();
const notes = [];
const shotMeta = [];

async function shot(page, name) {
  const local = join(OUT, name);
  if (existsSync(local)) unlinkSync(local);
  await page.screenshot({ path: local, fullPage: false });
  try {
    copyFileSync(local, join(OPT, name));
  } catch {
    /* ignore */
  }
  const hash = createHash("md5").update(readFileSync(local)).digest("hex");
  const st = statSync(local);
  shotMeta.push({
    file: name,
    md5: hash,
    mtime: st.mtime.toISOString(),
    bytes: st.size,
  });
  console.log("shot", name, hash.slice(0, 8), st.mtime.toISOString());
}

async function seedCart(context) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/cart/batch-add`, {
    data: { items: [{ variantId: WINE_ID, quantity: 6 }] },
  });
  if (!res.ok()) {
    throw new Error(`batch-add ${res.status()} ${await res.text()}`);
  }
  await page.close();
}

async function selectMode(page, mode) {
  const radios = page.locator('input[name="fulfillment_channel"]');
  const idx = mode === "shared_pallet" ? 0 : 1;
  if ((await radios.count()) > idx) {
    const el = radios.nth(idx);
    if (!(await el.isChecked())) await el.click({ force: true });
  }
  await page.waitForTimeout(800);
}

async function waitPreview(page, mode) {
  const needle =
    mode === "direct_box"
      ? /149\s*kr[\s\S]{0,40}5–10/i
      : /99\s*kr[\s\S]{0,80}30 dagar|99\s*kr[\s\S]{0,80}within 30/i;
  await page.waitForFunction(
    (reSrc) => new RegExp(reSrc, "i").test(document.body?.innerText || ""),
    needle.source,
    { timeout: 25000 },
  );
}

async function expandMobileOrder(page, label) {
  if (!label.startsWith("390")) return;
  const toggle = page.getByTestId("checkout-order-summary-toggle");
  if (!(await toggle.count())) return;
  const visible = await toggle.isVisible().catch(() => false);
  if (!visible) return;
  const expanded = await toggle.getAttribute("aria-expanded");
  if (expanded !== "true") {
    await toggle.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function run(label, browserType, launchOpts) {
  const browser = await browserType.launch({
    ...launchOpts,
    ignoreHTTPSErrors: true,
  });
  const context = await browser.newContext({
    ...launchOpts,
    ignoreHTTPSErrors: true,
  });
  await seedCart(context);
  const page = await context.newPage();
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#checkout-postal");
  await page.fill("#checkout-postal", "11151");
  await page.waitForSelector('input[name="fulfillment_channel"]', {
    timeout: 45000,
  });

  await selectMode(page, "shared_pallet");
  try {
    await waitPreview(page, "shared_pallet");
  } catch {
    notes.push(`${label}: shared preview wait soft-fail`);
  }
  await expandMobileOrder(page, label);
  await shot(page, `${label}-shared_pallet.png`);

  await selectMode(page, "direct_box");
  try {
    await waitPreview(page, "direct_box");
  } catch {
    notes.push(`${label}: direct preview wait soft-fail`);
  }
  await expandMobileOrder(page, label);
  await shot(page, `${label}-direct_box.png`);

  // Optional 7th mobile proof with order body forced open.
  if (label === "390-chromium") {
    await expandMobileOrder(page, label);
    await shot(page, `390-chromium-order-summary.png`);
  }

  await browser.close();
}

async function main() {
  console.log("HEAD", HEAD, "OUT", OUT);
  await run("1440", chromium, { viewport: { width: 1440, height: 900 } });
  await run("390-chromium", chromium, {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: devices["iPhone 13"].userAgent,
  });
  await run("390", webkit, { ...devices["iPhone 13"] });

  const mustDiffer = [
    ["1440-shared_pallet.png", "1440-direct_box.png"],
    ["390-chromium-shared_pallet.png", "390-chromium-direct_box.png"],
    ["390-shared_pallet.png", "390-direct_box.png"],
  ];
  for (const [a, b] of mustDiffer) {
    const ha = createHash("md5")
      .update(readFileSync(join(OUT, a)))
      .digest("hex");
    const hb = createHash("md5")
      .update(readFileSync(join(OUT, b)))
      .digest("hex");
    if (ha === hb) throw new Error(`md5 collision: ${a} === ${b}`);
  }
  const seen = new Map();
  for (const row of shotMeta) {
    const prev = seen.get(row.md5);
    if (prev) notes.push(`WARN duplicate md5 ${row.md5.slice(0, 8)}: ${prev} & ${row.file}`);
    else seen.set(row.md5, row.file);
  }

  const captured = new Date().toISOString();
  const body = [
    `# kassa-hotfix v3 — step-1 shipping preview`,
    ``,
    `- git HEAD: \`${HEAD}\``,
    `- HEAD committer date: ${HEAD_CI}`,
    `- screenshots captured at (UTC): ${captured}`,
    `- Evidence: Agent Store \`/cursor/stores/self/artifacts/kassa-hotfix/v3/\` (NOT in git)`,
    ``,
    `## Checks`,
    ...notes.map((n) => `- ${n}`),
    ``,
    `## Files`,
    ...shotMeta.map(
      (r) =>
        `- ${r.file} md5=\`${r.md5}\` mtime=${r.mtime} bytes=${r.bytes}`,
    ),
  ].join("\n");
  writeFileSync(join(OUT, "notes.md"), body);
  console.log(body);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
