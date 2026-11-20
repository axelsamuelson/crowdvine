/**
 * Guest checkout hotfix evidence — writes ONLY to Agent Store + /opt/cursor/artifacts.
 * Never commit artifacts/ into the repo.
 *
 * node scripts/kassa-hotfix-screenshots.mjs
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
/** Agent Store only — never repo artifacts/ */
const OUT = "/cursor/stores/self/artifacts/kassa-hotfix/v2";
const OPT = "/opt/cursor/artifacts/kassa-hotfix-v2";
mkdirSync(OUT, { recursive: true });
mkdirSync(OPT, { recursive: true });

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const HEAD_CI = execSync("git log -1 --format=%ci", { encoding: "utf8" }).trim();
const notes = [];
const shotMeta = [];

function freshEmail(prefix) {
  return `kassa.hotfix+${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

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
  const byValue = page.locator(
    `input[name="fulfillment_channel"][value="${mode}"]`,
  );
  if (await byValue.count()) {
    if (!(await byValue.first().isChecked())) {
      await byValue.first().click({ force: true });
    }
  } else {
    const radios = page.locator('input[name="fulfillment_channel"]');
    const idx = mode === "shared_pallet" ? 0 : 1;
    if ((await radios.count()) > idx) {
      const el = radios.nth(idx);
      if (!(await el.isChecked())) await el.click({ force: true });
    } else {
      const label =
        mode === "direct_box"
          ? page.getByText(/Direktleverans/i).first()
          : page.getByText(/Delad pall/i).first();
      if (await label.count()) await label.click({ force: true });
    }
  }
  await page.waitForTimeout(1000);
}

async function waitFrakt(page, expectSek) {
  await page.waitForFunction(
    (sek) => {
      const t = document.body?.innerText || "";
      if (/Beräknas efter postnummer|Frakt bekräftas innan/i.test(t))
        return false;
      if (sek != null) {
        return new RegExp(`Frakt[\\s\\S]{0,100}?${sek}\\s*kr`, "i").test(t);
      }
      return /Frakt[\s\S]{0,100}?\d[\d\s]*kr/i.test(t);
    },
    expectSek,
    { timeout: 35000 },
  );
}

async function acceptTerms(page) {
  await page.evaluate(() => {
    const el = document.querySelector("#terms-accept");
    if (!el) return;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForTimeout(200);
  const state = await page
    .locator("#terms-accept")
    .getAttribute("data-state")
    .catch(() => null);
  if (state !== "checked") {
    await page.locator("#terms-accept").click({ force: true });
    await page.locator('label[for="terms-accept"]').click({ force: true });
  }
  await page.waitForTimeout(200);
}

async function fillDob(page) {
  const dob = page.locator("#age-dob");
  await dob.waitFor({ state: "visible", timeout: 20000 });
  await dob.fill("");
  await dob.pressSequentially("19900115", { delay: 20 });
  await dob.blur();
  await page.waitForTimeout(300);
}

async function waitPe(page, net) {
  for (let i = 0; i < 45; i++) {
    const t = await page.locator("body").innerText();
    const err = /leverantör av betaltjänster|Unacceptable TLS|kunde inte laddas/i.test(
      t,
    );
    let card = false;
    for (const f of page.frames()) {
      if (
        (await f
          .locator('input[name="number"], input[autocomplete="cc-number"]')
          .count()
          .catch(() => 0)) > 0
      ) {
        card = true;
        break;
      }
    }
    const pi200 = net.filter(
      (n) => n.kind === "res" && n.url.includes("payment-intent") && n.status === 200,
    ).length;
    if (card && pi200 > 0) return { ok: true, err: false, pi200 };
    if (err && i > 8) return { ok: false, err: true, pi200 };
    await page.waitForTimeout(1000);
  }
  return { ok: false, err: false, pi200: 0 };
}

async function fill4242(page) {
  for (const frame of page.frames()) {
    const num = frame.locator(
      'input[name="number"], input[autocomplete="cc-number"]',
    );
    if ((await num.count()) === 0) continue;
    await num.first().fill("4242424242424242");
    const exp = frame.locator(
      'input[name="expiry"], input[autocomplete="cc-exp"]',
    );
    if (await exp.count()) await exp.first().fill("1234");
    const cvc = frame.locator(
      'input[name="cvc"], input[autocomplete="cc-csc"]',
    );
    if (await cvc.count()) await cvc.first().fill("123");
    return true;
  }
  return false;
}

async function run(label, browserType, contextOpts) {
  const browser = await browserType.launch({ headless: true });
  // WebKit in this VM rejects Stripe's TLS ("Unacceptable TLS certificate").
  // Real Safari trusts Stripe; ignoreHTTPSErrors is screenshot-env only.
  const context = await browser.newContext({
    locale: "sv-SE",
    colorScheme: "light",
    ignoreHTTPSErrors: true,
    ...contextOpts,
  });
  await seedCart(context);
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const net = [];
  page.on("requestfailed", (req) => {
    const u = req.url();
    if (/stripe|payment-intent/.test(u)) {
      net.push({
        kind: "fail",
        url: u.slice(0, 200),
        err: req.failure()?.errorText,
      });
    }
  });
  page.on("response", async (res) => {
    const u = res.url();
    if (!/payment-intent|api\.stripe\.com/.test(u)) return;
    let body = "";
    try {
      if (u.includes("payment-intent")) body = (await res.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    net.push({ kind: "res", status: res.status(), url: u.slice(0, 200), body });
  });

  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#checkout-postal");
  await page.fill("#checkout-postal", "11151");
  await page.waitForTimeout(500);
  // Capture postal step before channel radios settle / rates load.
  await shot(page, `${label}-postnummer.png`);

  await page.waitForSelector("#checkout-fullName", { timeout: 45000 });
  await page.waitForSelector('input[name="fulfillment_channel"]', {
    timeout: 45000,
  });
  await selectMode(page, "shared_pallet");
  try {
    await waitFrakt(page, 99);
  } catch {
    notes.push(`${label}: shared 99 wait soft-fail`);
  }
  // Prove shared selection: label + Leverans copy must not be Direktleverans.
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return (
          /Delad pall/i.test(t) &&
          /Delad pall:|Levereras normalt 2–3 veckor|Efter stängningen/i.test(t) &&
          !/Leverans\s*\n\s*Direktleverans/i.test(t)
        );
      },
      { timeout: 20000 },
    );
  } catch {
    notes.push(`${label}: shared Leverans copy wait soft-fail`);
  }
  await shot(page, `${label}-shared_pallet.png`);

  await selectMode(page, "direct_box");
  try {
    await waitFrakt(page, 149);
  } catch {
    notes.push(`${label}: direct 149 wait soft-fail`);
  }
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return (
          /Direktleverans/i.test(t) &&
          (/149\s*kr/i.test(t) || /5–10 arbetsdagar/i.test(t))
        );
      },
      { timeout: 20000 },
    );
  } catch {
    notes.push(`${label}: direct Leverans copy wait soft-fail`);
  }
  await shot(page, `${label}-direct_box.png`);

  await page.fill("#checkout-fullName", "Test Gäst");
  await page.fill("#checkout-email", "test@");
  await page.fill("#checkout-street", "Testgatan 1");
  await page.fill("#checkout-city", "Stockholm");
  await page.waitForTimeout(300);
  notes.push(
    `${label}: midEmailOpen=${(await page.locator("#checkout-email").count()) > 0}`,
  );
  await page.fill("#checkout-email", freshEmail(label));
  await page.fill("#checkout-phone", "0701234567");
  await page.waitForTimeout(2500);
  const locked = await page
    .getByText("Fyll i leveransadressen först för att fortsätta")
    .isVisible()
    .catch(() => false);
  notes.push(`${label}: ageLocked=${locked}`);
  await shot(page, `${label}-saved-address-age.png`);

  await fillDob(page);
  await acceptTerms(page);
  await shot(page, `${label}-age-terms.png`);

  const cont = page.getByRole("button", {
    name: /Fortsätt till betalkort|Continue to payment/i,
  });
  for (let i = 0; i < 20 && !(await cont.isEnabled().catch(() => false)); i++) {
    await acceptTerms(page);
    await page.waitForTimeout(200);
  }
  await cont.click({ force: true });

  // PE for current mode (direct_box), then shared
  for (const mode of ["direct_box", "shared_pallet"]) {
    if (mode === "shared_pallet") {
      await page.evaluate(() => window.scrollTo(0, 0));
      await selectMode(page, "shared_pallet");
      try {
        await waitFrakt(page, 99);
      } catch {
        /* ignore */
      }
    }
    const pe = await waitPe(page, net);
    notes.push(
      `${label}:${mode} peOk=${pe.ok} peErr=${pe.err} pi200=${pe.pi200} stripeFails=${net.filter((n) => n.kind === "fail").length}`,
    );
    if (pe.ok) {
      await fill4242(page);
      await page.waitForTimeout(1500);
    }
    // Scroll PE into view
    await page
      .locator("text=Betalkort")
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await shot(page, `${label}-payment-element-${mode}.png`);
  }

  writeFileSync(
    join(OUT, `diag-net-${label}.json`),
    JSON.stringify(net, null, 2),
  );
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

  // Fail hard on duplicate evidence pairs that previously collided.
  const mustDiffer = [
    ["390-postnummer.png", "390-shared_pallet.png"],
    ["390-chromium-postnummer.png", "390-chromium-shared_pallet.png"],
    ["1440-postnummer.png", "1440-shared_pallet.png"],
    ["1440-shared_pallet.png", "1440-direct_box.png"],
    ["390-shared_pallet.png", "390-direct_box.png"],
    ["390-chromium-shared_pallet.png", "390-chromium-direct_box.png"],
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
  const allHashes = new Map();
  for (const row of shotMeta) {
    const prev = allHashes.get(row.md5);
    if (prev) notes.push(`WARN duplicate md5 ${row.md5.slice(0, 8)}: ${prev} & ${row.file}`);
    else allHashes.set(row.md5, row.file);
  }

  const captured = new Date().toISOString();
  const body = [
    `# kassa-hotfix screenshot notes (v2)`,
    ``,
    `- git HEAD (code under test): \`${HEAD}\``,
    `- HEAD committer date: ${HEAD_CI}`,
    `- screenshots captured at (UTC): ${captured}`,
    `- APP_URL: ${BASE}`,
    `- Stripe test keys (pk_test_/rk_test_) vs Supabase TEST msdfjrrokcmjifetuwgc`,
    `- Evidence location: Agent Store \`/cursor/stores/self/artifacts/kassa-hotfix/v2/\` (NOT in git)`,
    ``,
    `## 390 WebKit TLS note`,
    `- Without ignoreHTTPSErrors, Playwright WebKit fails api.stripe.com with **Unacceptable TLS certificate** (environment).`,
    `- Chromium mobile 390 mounts PE without that TLS failure.`,
    `- Screenshots use ignoreHTTPSErrors so WebKit can load PE; product Safari trusts Stripe normally.`,
    `- Console/network dumps: diag-net-390.json, diag-net-390-chromium.json`,
    ``,
    `## Checks`,
    ...notes.map((n) => `- ${n}`),
    ``,
    `## Files`,
    ...shotMeta.map(
      (r) => `- ${r.file} md5=\`${r.md5}\` mtime=${r.mtime} bytes=${r.bytes}`,
    ),
  ].join("\n");
  writeFileSync(join(OUT, "notes.md"), body + "\n");
  try {
    copyFileSync(join(OUT, "notes.md"), join(OPT, "kassa-hotfix-notes.md"));
  } catch {
    /* ignore */
  }
  console.log(body);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
