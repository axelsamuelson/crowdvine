/**
 * Evidence for kassa steg 1 leveranstexter (v4 — full page).
 * artifacts/kassa-steg1/v4/ (gitignored) + /opt/cursor/artifacts + agent store.
 * TEST only — msdfjrrokcmjifetuwgc. Never commit. No auth emails. No Vercel writes.
 *
 * Cases: utan-postnummer | stockholm | kiruna-direkt | ingen-leverans
 * Local carrier env must be set in .env.local (DIRECT_BOX_CARRIER_*).
 * For ingen-leverans the script temporarily disables quoting and restarts
 * the local Next server (tmux session kassa-steg1-dev).
 *
 * node scripts/kassa-steg1-leveranstexter-screenshots.mjs
 */
import { chromium } from "playwright";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  unlinkSync,
  copyFileSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-steg1", "v4");
const OUT_OPT = "/opt/cursor/artifacts/kassa-steg1/v4";
const OUT_STORE = "/cursor/stores/self/artifacts/kassa-steg1/v4";
for (const d of [OUT_REPO, OUT_OPT, OUT_STORE]) mkdirSync(d, { recursive: true });

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* ignore */
  }
}

function requireTestEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url.includes("msdfjrrokcmjifetuwgc")) {
    throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not TEST");
  }
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  if (pk && !pk.startsWith("pk_test")) {
    throw new Error("Refusing: Stripe publishable key is not test mode");
  }
}

function setEnvLocalKey(key, value) {
  const path = join(process.cwd(), ".env.local");
  const lines = readFileSync(path, "utf8").split("\n");
  let found = false;
  const out = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) out.push(`${key}=${value}`);
  writeFileSync(path, out.filter((l, i, a) => l || i < a.length - 1).join("\n") + "\n");
}

function restartDevServer() {
  const session = "kassa-steg1-dev";
  const tmux = "tmux -f /exec-daemon/tmux.portal.conf";
  try {
    execSync(`${tmux} send-keys -t ${session}:0.0 C-c`, { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  execSync("sleep 1");
  execSync(
    `${tmux} send-keys -t ${session}:0.0 'cd /agent/repos/crowdvine && pnpm dev' C-m`,
    { stdio: "ignore" },
  );
  // Wait until Ready
  for (let i = 0; i < 40; i++) {
    try {
      const r = execSync("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/", {
        encoding: "utf8",
      }).trim();
      if (r === "200" || r === "307" || r === "302") return;
    } catch {
      /* retry */
    }
    execSync("sleep 1");
  }
  throw new Error("Dev server did not become ready after restart");
}

async function ensureSyntheticUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing supabase env");
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `kassa.steg1.v4.${Date.now()}@example.com`;
  const password = `Synth-${Date.now()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Kassa Steg1 V4 Syntetisk" },
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("No synthetic user id");
  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: "Kassa Steg1 V3 Syntetisk",
  });
  return { email, password, userId };
}

async function shot(page, name) {
  for (const dir of [OUT_REPO, OUT_OPT, OUT_STORE]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, fullPage: true });
  }
  const buf = readFileSync(join(OUT_REPO, name));
  console.log(
    "shot",
    name,
    createHash("md5").update(buf).digest("hex").slice(0, 8),
    statSync(join(OUT_REPO, name)).size,
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

async function fillPostalAndWait(page, postal) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const input = page.locator("#checkout-postal");
    const visible = await input.isVisible().catch(() => false);
    if (visible) {
      await input.fill("");
      await input.fill(postal);
      await input.blur().catch(() => {});
      await page.waitForTimeout(3000);
      return;
    }
    const edit = page
      .getByRole("button", { name: /Ändra|Edit|Change|Redigera/i })
      .first();
    if (await edit.count()) {
      await edit.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      continue;
    }
    await page.waitForTimeout(600);
  }
  throw new Error(`Could not focus postal input for ${postal}`);
}

async function expandSummary(page) {
  const body = page.locator('[data-testid="checkout-order-summary-body"]');
  if (await body.isVisible().catch(() => false)) return;
  const toggle = page.locator('[data-testid="checkout-order-summary-toggle"]');
  if (await toggle.count()) await toggle.click().catch(() => {});
}

async function forceLight(page) {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addStyleTag({
    content: "html { color-scheme: light !important; }",
  });
}

async function openCheckout(page, locale) {
  const checkoutPath = locale === "en" ? "/en/checkout" : "/checkout";
  await page.goto(`${BASE}${checkoutPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#checkout-postal", {
    state: "visible",
    timeout: 60000,
  });
}

async function captureCase(page, locale, width, caseName, setup) {
  const label = `${locale}-${width}-${caseName}`;
  await openCheckout(page, locale);
  await forceLight(page);
  await setup(page);
  await expandSummary(page);
  await page.waitForTimeout(500);
  await shot(page, `${label}.png`);
}

async function runBatch(cases, locales, widths) {
  for (const locale of locales) {
    for (const width of widths) {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        locale: locale === "en" ? "en-US" : "sv-SE",
        colorScheme: "light",
        viewport: { width, height: width === 390 ? 844 : 900 },
        deviceScaleFactor: 1,
        ignoreHTTPSErrors: true,
      });
      await context.addCookies([
        {
          name: "NEXT_LOCALE",
          value: locale,
          domain: "localhost",
          path: "/",
        },
      ]);
      await seedCart(context);
      const page = await context.newPage();
      page.setDefaultTimeout(45000);
      for (const c of cases) {
        await captureCase(page, locale, width, c.name, c.setup);
      }
      await browser.close();
    }
  }
}

async function main() {
  loadEnvLocal();
  requireTestEnv();
  const synth = await ensureSyntheticUser();
  console.log("synthetic_user", synth.email);
  void synth;

  const locales = ["sv", "en"];
  const widths = [390, 1440];

  // --- Batch A: carrier quoting ON (Stockholm + Kiruna-direct + utan postnummer)
  setEnvLocalKey("DIRECT_BOX_CARRIER_QUOTING_ENABLED", "true");
  restartDevServer();
  console.log("batch_a quoting=on");

  await runBatch(
    [
      {
        name: "utan-postnummer",
        setup: async (page) => {
          try {
            await page.waitForFunction(
              () => {
                const t = document.body?.innerText || "";
                const hasExcl =
                  /exkl\. frakt|excl\. shipping/i.test(t) &&
                  /1\s*032|1032/.test(t);
                const noPulse = !document.querySelector(
                  '[data-testid="checkout-summary-total"] .animate-pulse',
                );
                return hasExcl && noPulse;
              },
              { timeout: 20000 },
            );
          } catch {
            console.warn("utan-postnummer wait soft-fail");
          }
        },
      },
      {
        name: "stockholm",
        setup: async (page) => {
          await fillPostalAndWait(page, "11151");
          try {
            await page.waitForFunction(
              () => {
                const t = document.body?.innerText || "";
                return (
                  /99\s*kr|99\s*SEK/i.test(t) &&
                  /Delad pall|Shared pallet/i.test(t) &&
                  !/kan inte beräknas|cannot be calculated/i.test(t)
                );
              },
              { timeout: 45000 },
            );
          } catch {
            console.warn("stockholm wait soft-fail");
          }
        },
      },
      {
        name: "kiruna-direkt",
        setup: async (page) => {
          await fillPostalAndWait(page, "98131");
          try {
            await page.waitForFunction(
              () => {
                const t = document.body?.innerText || "";
                const directSelected = Boolean(
                  document.querySelector(
                    'input[name="fulfillment_channel"][value="direct_box"]:checked',
                  ),
                );
                const hasDirectPrice =
                  /149\s*kr|149\s*SEK/i.test(t) ||
                  /Direktleverans|Direct delivery/i.test(t);
                const noRedArea =
                  !/Vi levererar inte till ditt postnummer|We don't deliver to your postal/i.test(
                    t,
                  );
                const etaOk =
                  /5–10\s+arbetsdagar|5–10\s+business days/i.test(t) &&
                  !(/Direct delivery|per box|bottle price/i.test(t) &&
                    /arbetsdagar/i.test(t));
                const hasShipsFrom =
                  /Skickas från|Ships from/i.test(t) &&
                  Boolean(
                    document.querySelector(
                      '[data-testid="checkout-delivery-promise"]',
                    ),
                  );
                return (
                  (directSelected || /Direktleverans|Direct delivery/i.test(t)) &&
                  hasDirectPrice &&
                  noRedArea &&
                  etaOk &&
                  hasShipsFrom &&
                  /utanför leveranszonen|outside the delivery zone|not available for your postal/i.test(
                    t,
                  )
                );
              },
              { timeout: 45000 },
            );
          } catch {
            console.warn("kiruna-direkt wait soft-fail");
          }
          // Ensure direct is selected if radios exist
          const direct = page.locator(
            'input[name="fulfillment_channel"][value="direct_box"]',
          );
          if (await direct.count()) {
            if (!(await direct.isChecked().catch(() => false))) {
              await direct.click({ force: true }).catch(() => {});
              await page.waitForTimeout(1500);
            }
          }
        },
      },
    ],
    locales,
    widths,
  );

  // --- Batch B: no delivery possible (quoting OFF + Kiruna)
  setEnvLocalKey("DIRECT_BOX_CARRIER_QUOTING_ENABLED", "false");
  restartDevServer();
  console.log("batch_b quoting=off (ingen-leverans)");

  await runBatch(
    [
      {
        name: "ingen-leverans",
        setup: async (page) => {
          await fillPostalAndWait(page, "98131");
          try {
            await page.waitForFunction(
              () => {
                const t = document.body?.innerText || "";
                const row = document.querySelector(
                  '[data-testid="checkout-shipping-summary-unavailable"]',
                );
                const shortUnavailable = /Ej tillgänglig|Not available/i.test(
                  t,
                );
                const redOnce =
                  /Vi levererar inte till ditt postnummer ännu|We don't deliver to your postal code yet/i.test(
                    t,
                  );
                const addressLocked =
                  /Byt postnummer för att gå vidare|Change your postal code to continue/i.test(
                    t,
                  );
                const directPostalUnavailable =
                  /Direktleverans är inte tillgänglig för ditt postnummer|Direct delivery is not available for your postal code/i.test(
                    t,
                  );
                const noYellowTemp =
                  !/går inte att beräkna just nu|cannot be calculated right now/i.test(
                    t,
                  );
                return (
                  (Boolean(row) || shortUnavailable) &&
                  redOnce &&
                  addressLocked &&
                  directPostalUnavailable &&
                  noYellowTemp &&
                  /exkl\. frakt|excl\. shipping/i.test(t)
                );
              },
              { timeout: 45000 },
            );
          } catch {
            console.warn("ingen-leverans wait soft-fail");
          }
        },
      },
    ],
    locales,
    widths,
  );

  // Restore quoting ON for local continued work
  setEnvLocalKey("DIRECT_BOX_CARRIER_QUOTING_ENABLED", "true");
  restartDevServer();

  writeFileSync(
    join(OUT_REPO, "README.txt"),
    "kassa-steg1/v4 full-page screenshots — light, SV/EN, 390/1440. TEST only. Do not commit.\n",
  );
  for (const d of [OUT_OPT, OUT_STORE]) {
    copyFileSync(join(OUT_REPO, "README.txt"), join(d, "README.txt"));
  }
  console.log("done →", OUT_REPO);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
