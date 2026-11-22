/**
 * Kassabugg v2 evidence: postal-only guest reload + multi-city coverage.
 * /opt/cursor/artifacts/kassa-kiruna-pall/v2/ (+ repo + store). Never commit.
 * TEST only — msdfjrrokcmjifetuwgc. No auth emails. No prod writes.
 *
 * NOTE: TEST pallet_zones currently has only Synthetic Stockholm Delivery (40km).
 * Göteborg 41101 / Malmö 21115 / Uppsala 75310 will show Delad disabled on TEST.
 * Prod-mirroring unit tests cover those radii (lib/__tests__/delivery-zone-geo-match.test.ts).
 * We did NOT seed extra zones into TEST.
 *
 * APP_URL=http://localhost:3000 node scripts/kassa-kiruna-pall-v2-screenshots.mjs
 */
import { chromium } from "playwright";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { execSync } from "node:child_process";

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-kiruna-pall", "v2");
const OUT_OPT = "/opt/cursor/artifacts/kassa-kiruna-pall/v2";
const OUT_STORE = "/cursor/stores/self/artifacts/kassa-kiruna-pall/v2";
for (const d of [OUT_REPO, OUT_OPT, OUT_STORE]) mkdirSync(d, { recursive: true });

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const BRANCH = execSync("git rev-parse --abbrev-ref HEAD", {
  encoding: "utf8",
}).trim();

/** @type {Array<Record<string, string|number|boolean|undefined>>} */
const manifestRows = [];

function requireTestEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url.includes("msdfjrrokcmjifetuwgc")) {
    throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not TEST");
  }
  const pk =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY ||
    "";
  if (pk && !pk.startsWith("pk_test")) {
    throw new Error("Refusing: Stripe publishable key is not test mode");
  }
}

async function shot(page, name, meta) {
  const captured_at = new Date().toISOString();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await waitZoneSettled(page);
  const nav = await page.evaluate(() => {
    const entries = performance.getEntriesByType("navigation");
    const n = entries && entries[0] ? entries[0] : null;
    return {
      navigationType: n && "type" in n ? String(n.type) : "unknown",
      performanceNowMs: Math.round(performance.now()),
    };
  });
  for (const dir of [OUT_REPO, OUT_OPT, OUT_STORE]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, fullPage: false });
  }
  const buf = readFileSync(join(OUT_REPO, name));
  const md5 = createHash("md5").update(buf).digest("hex");
  const bytes = statSync(join(OUT_REPO, name)).size;
  manifestRows.push({
    file: name,
    case: meta.case,
    user: meta.user,
    captured_at,
    notes: meta.notes,
    md5,
    bytes,
    navigation_type: nav.navigationType,
    performance_now_ms: nav.performanceNowMs,
    reload_seq: meta.reload_seq,
    expect_shared: meta.expect_shared,
  });
  console.log(
    "shot",
    name,
    md5.slice(0, 8),
    bytes,
    "nav=" + nav.navigationType,
    "t=" + nav.performanceNowMs,
    meta.user,
  );
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

async function waitNoCartLoading(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="checkout-cart-loading"]'),
    { timeout: 90000 },
  );
}

async function waitZoneSettled(page) {
  await page
    .waitForFunction(
      () => !/Uppdaterar leverans/i.test(document.body?.innerText || ""),
      { timeout: 60000 },
    )
    .catch(() => {});
  await page.waitForTimeout(800);
}

async function clearSiteData(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.context().clearCookies();
}

async function enterPostalOnly(page, postal) {
  await page.waitForSelector("#checkout-postal", { timeout: 45000 });
  await page.fill("#checkout-postal", "");
  await page.fill("#checkout-postal", postal);
}

async function ensurePostalPresent(page, postal) {
  const body = (await page.locator("body").innerText()) || "";
  if (new RegExp(postal).test(body)) return;
  const inputVisible = await page
    .locator("#checkout-postal")
    .isVisible()
    .catch(() => false);
  if (inputVisible) {
    const v = (await page.inputValue("#checkout-postal")).replace(/\s+/g, "");
    if (v !== postal) await page.fill("#checkout-postal", postal);
    return;
  }
  const change = page
    .getByRole("button", { name: /Ändra|Byt|Edit|Change/i })
    .first();
  if (await change.isVisible().catch(() => false)) {
    await change.click();
    await page.waitForTimeout(400);
  }
  await page.waitForSelector("#checkout-postal", { timeout: 20000 });
  await page.fill("#checkout-postal", postal);
}

async function assertOutOfZoneShared(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      return /utanför leveranszonen|inte tillgänglig för ditt postnummer/i.test(
        t,
      );
    },
    { timeout: 90000 },
  );
  const disabled = await page
    .locator("label")
    .filter({ hasText: /Delad pall/i })
    .first()
    .locator("input")
    .isDisabled();
  if (!disabled) throw new Error("Delad pall should be disabled out of zone");
}

async function assertSharedAvailable(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      const out =
        /utanför leveranszonen|inte tillgänglig för ditt postnummer/i.test(t);
      const sharedOk =
        /Delad pall[\s\S]{0,200}99/i.test(t) &&
        !/Delad pall[\s\S]{0,200}inte tillgänglig/i.test(t);
      return !out && sharedOk;
    },
    { timeout: 90000 },
  );
}

/**
 * Exact guest: clear storage → postal only → shot → reload → restore postal
 * (Chrome form restore) → shot. Captures navigation type so identical pixels
 * still prove the after shot is post-reload.
 */
async function runGuestPostalReload(
  label,
  viewport,
  { postal, expectShared, cityLabel },
) {
  const guestTag = `anonymous:kassa.kiruna.pall.v2.${label}.${postal}.${Date.now()}@example.com`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "sv-SE",
    colorScheme: "light",
    viewport,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  await clearSiteData(page);
  await seedCart(context);
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  await enterPostalOnly(page, postal);
  await waitZoneSettled(page);
  if (expectShared) await assertSharedAvailable(page);
  else await assertOutOfZoneShared(page);

  const beforeNav = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    return n && "type" in n ? String(n.type) : "unknown";
  });

  await shot(page, `${label}-guest-${postal}-before-reload.png`, {
    case: `guest_${postal}_before_reload`,
    user: guestTag,
    notes: `Guest cleared-storage ${postal} (${cityLabel}) BEFORE reload; nav=${beforeNav}`,
    reload_seq: "before",
    expect_shared: expectShared,
  });

  const reloadStartedAt = new Date().toISOString();
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  await ensurePostalPresent(page, postal);
  await waitZoneSettled(page);
  if (expectShared) await assertSharedAvailable(page);
  else await assertOutOfZoneShared(page);

  const afterNav = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    return n && "type" in n ? String(n.type) : "unknown";
  });
  if (afterNav !== "reload") {
    console.warn(
      `warn: expected navigation.type=reload after reload, got ${afterNav} for ${postal}`,
    );
  }

  await shot(page, `${label}-guest-${postal}-after-reload.png`, {
    case: `guest_${postal}_after_reload`,
    user: guestTag,
    notes: `Guest ${postal} (${cityLabel}) AFTER reload; nav=${afterNav}; reload_started_at=${reloadStartedAt}`,
    reload_seq: "after",
    expect_shared: expectShared,
  });

  await browser.close();
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://msdfjrrokcmjifetuwgc.supabase.co";
  }
  if (
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY
  ) {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY =
      process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY;
  }
  requireTestEnv();
  console.log("head", HEAD, "branch", BRANCH, "app", BASE);
  console.log(
    "TEST_NOTE: only Synthetic Stockholm Delivery (40km) — GBG/Malmö/Uppsala lack zones in TEST; Delad expected disabled there. Prod-mirror unit tests cover radii. Zones NOT seeded into TEST.",
  );

  const cases = [
    {
      postal: "98131",
      cityLabel: "Kiruna",
      expectShared: false,
    },
    {
      postal: "11151",
      cityLabel: "Stockholm",
      expectShared: true,
    },
    {
      postal: "41101",
      cityLabel: "Göteborg — TEST lacks zone (prod has 50/150km)",
      expectShared: false,
    },
    {
      postal: "21115",
      cityLabel: "Malmö — TEST lacks zone (prod has 150km)",
      expectShared: false,
    },
    {
      postal: "75310",
      cityLabel: "Uppsala — TEST lacks zone (prod has 100km)",
      expectShared: false,
    },
  ];

  const viewports =
    process.env.VIEWPORTS === "1440"
      ? [["1440", { width: 1440, height: 900 }]]
      : process.env.VIEWPORTS === "390"
        ? [["390", { width: 390, height: 844 }]]
        : [
            ["390", { width: 390, height: 844 }],
            ["1440", { width: 1440, height: 900 }],
          ];
  for (const [label, viewport] of viewports) {
    for (const c of cases) {
      await runGuestPostalReload(label, viewport, c);
    }
  }

  // Prove 98131 before/after are distinct captures even if pixels match.
  const kirunaPairs = ["390", "1440"].map((label) => {
    const before = manifestRows.find(
      (r) => r.file === `${label}-guest-98131-before-reload.png`,
    );
    const after = manifestRows.find(
      (r) => r.file === `${label}-guest-98131-after-reload.png`,
    );
    return {
      label,
      before_captured_at: before?.captured_at,
      after_captured_at: after?.captured_at,
      before_nav: before?.navigation_type,
      after_nav: after?.navigation_type,
      before_perf_ms: before?.performance_now_ms,
      after_perf_ms: after?.performance_now_ms,
      same_md5: before?.md5 === after?.md5,
      after_is_later:
        before && after
          ? String(after.captured_at) > String(before.captured_at)
          : false,
      after_reload_seq: after?.reload_seq,
    };
  });

  const lines = [
    `head_sha=${HEAD}`,
    `branch=${BRANCH}`,
    `app_url=${BASE}`,
    `test_project=msdfjrrokcmjifetuwgc`,
    `locale=sv-SE`,
    `color_scheme=light`,
    `captured_at=${new Date().toISOString()}`,
    `test_delivery_zones=Synthetic Stockholm Delivery 40km ONLY`,
    `test_zones_not_seeded=Göteborg,Malmö,Helsingborg,Linköping,Örebro,Uppsala,Västerås`,
    `prod_mirror_unit_tests=lib/__tests__/delivery-zone-geo-match.test.ts`,
    "",
    "kiruna_98131_reload_proof:",
    ...kirunaPairs.map((p) => `- ${JSON.stringify(p)}`),
    "",
    "files:",
    ...manifestRows.map((r) => {
      return `- ${r.file} | case=${r.case} | user=${r.user} | captured_at=${r.captured_at} | navigation_type=${r.navigation_type} | performance_now_ms=${r.performance_now_ms} | reload_seq=${r.reload_seq} | md5=${r.md5} | bytes=${r.bytes} | expect_shared=${r.expect_shared} | ${r.notes}`;
    }),
  ];
  const manifest = lines.join("\n") + "\n";
  for (const dir of [OUT_REPO, OUT_OPT, OUT_STORE]) {
    writeFileSync(join(dir, "manifest.txt"), manifest);
  }
  console.log("done", OUT_REPO);
  console.log(manifest);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
