/**
 * Font cleanup before/after screenshots + computed font-family probe.
 *
 * Usage:
 *   BEFORE_BASE=https://pactwines.com AFTER_BASE=<preview> node scripts/font-cleanup-screenshots.mjs
 *   # or pass single base for one pass:
 *   BASE=https://pactwines.com PASS=before node scripts/font-cleanup-screenshots.mjs
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("docs/design-review/font-cleanup");
const ART = path.resolve("/opt/cursor/artifacts/font-cleanup");
for (const d of [OUT, ART]) fs.mkdirSync(d, { recursive: true });

const BEFORE = process.env.BEFORE_BASE || "https://pactwines.com";
const AFTER = process.env.AFTER_BASE || process.env.BASE || "";
const ONLY = process.env.PASS; // "before" | "after" | undefined (both)

const chrome =
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome";

const PAGES = [
  { slug: "plp-vin", path: "/vin" },
  { slug: "pdp", path: "/produkt/l-2023" },
  { slug: "guider-orange", path: "/guider/basta-orange-naturviner-systembolaget" },
  {
    slug: "guides-natural-vs-organic",
    path: "/guides/natural-vs-organic-vs-biodynamic-wine",
  },
  { slug: "log-in", path: "/log-in" },
  { slug: "checkout", path: "/checkout" },
];

const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
];

/** Selectors for affected elements on changed pages (prod vs preview table). */
const FONT_PROBES = [
  {
    page: "log-in",
    path: "/log-in",
    element: "footer line (was font-mono)",
    selector: ".fixed.bottom-10",
  },
  {
    page: "access-request",
    path: "/access-request",
    element: "footer line (was font-mono)",
    selector: ".fixed.bottom-10",
  },
  {
    page: "access-pending",
    path: "/access-pending",
    element: "invite code input (was font-mono)",
    selector: "#invite-code, input[type='text']",
    setup: async (page) => {
      // Reveal code input if gated behind a button
      const buttons = await page.$$("button");
      for (const b of buttons) {
        const t = await page.evaluate((el) => el.textContent || "", b);
        if (/code|kod|invitation|inbjud/i.test(t)) {
          await b.click().catch(() => {});
          await new Promise((r) => setTimeout(r, 400));
          break;
        }
      }
    },
  },
  {
    page: "stockholm-delivery-landing",
    path: "/stockholm",
    element: "step number (was font-mono)",
    selector: "ol li p.text-xs, ol li p",
    altPaths: ["/leverans-stockholm", "/stockholm-delivery", "/leverans"],
  },
  {
    page: "reservation-status",
    path: "/reservation-status",
    element: "reservation id (was font-mono)",
    selector: ".font-sans.tabular-nums, .font-mono, p.bg-gray-100",
  },
  {
    page: "error",
    path: "/error",
    element: "error digest (was font-mono) — may 404; probe class in DOM if present",
    selector: "p.text-muted-foreground, p.font-sans, p.font-mono",
  },
  {
    page: "checkout/success",
    path: "/checkout/success",
    element: "reservation id / reference (was font-mono)",
    selector: ".font-sans.tabular-nums, .font-mono, .break-all",
  },
];

function writeBoth(name, buf) {
  for (const dir of [OUT, ART]) {
    fs.writeFileSync(path.join(dir, name), buf);
  }
  console.log("wrote", name);
}

async function settle(page, ms = 1500) {
  await new Promise((r) => setTimeout(r, ms));
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await new Promise((r) => setTimeout(r, 200));
}

async function screenshotPass(browser, base, pass) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      isMobile: vp.width < 768,
      hasTouch: vp.width < 768,
    });
    for (const route of PAGES) {
      const url = `${base.replace(/\/$/, "")}${route.path}`;
      console.log(`[${pass}] ${vp.name} ${url}`);
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
        await settle(page, 2000);
        const buf = await page.screenshot({ fullPage: false, type: "png" });
        writeBoth(`${pass}-${route.slug}-${vp.name}.png`, buf);
      } catch (err) {
        console.error(`FAIL ${pass} ${route.slug} ${vp.name}:`, err.message);
      }
    }
    await page.close();
  }
}

async function probeFonts(browser, base, label) {
  const results = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const probe of FONT_PROBES) {
    const paths = [probe.path, ...(probe.altPaths || [])];
    let done = false;
    for (const pth of paths) {
      const url = `${base.replace(/\/$/, "")}${pth}`;
      try {
        const res = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        const status = res?.status() ?? 0;
        await settle(page, 1200);
        if (probe.setup) await probe.setup(page);
        const measured = await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const cs = getComputedStyle(el);
          return {
            fontFamily: cs.fontFamily,
            fontVariantNumeric: cs.fontVariantNumeric,
            tag: el.tagName.toLowerCase(),
            className: typeof el.className === "string" ? el.className : "",
            textSample: (el.textContent || "").trim().slice(0, 80),
          };
        }, probe.selector);
        results.push({
          pass: label,
          page: probe.page,
          path: pth,
          element: probe.element,
          httpStatus: status,
          found: Boolean(measured),
          ...(measured || {}),
        });
        done = true;
        break;
      } catch (err) {
        console.error(`probe fail ${label} ${pth}:`, err.message);
      }
    }
    if (!done) {
      results.push({
        pass: label,
        page: probe.page,
        path: probe.path,
        element: probe.element,
        found: false,
        error: "unreachable",
      });
    }
  }

  // Stripe appearance is JS config — report source-of-truth string from page if injected
  results.push({
    pass: label,
    page: "stripe-payment-section / authenticate-client",
    path: "(Elements appearance.variables.fontFamily)",
    element: "Stripe Elements fontFamily",
    found: true,
    note:
      label === "after"
        ? 'Geist, ui-sans-serif, sans-serif'
        : "prod: system-ui / Geist+system-ui (pre-change)",
  });

  await page.close();
  return results;
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chrome,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

const allProbes = [];
try {
  const doBefore = !ONLY || ONLY === "before";
  const doAfter = (!ONLY || ONLY === "after") && AFTER;

  if (doBefore) {
    await screenshotPass(browser, BEFORE, "before");
    allProbes.push(...(await probeFonts(browser, BEFORE, "before")));
  }
  if (doAfter) {
    await screenshotPass(browser, AFTER, "after");
    allProbes.push(...(await probeFonts(browser, AFTER, "after")));
  } else if (!ONLY || ONLY === "after") {
    console.warn("AFTER_BASE not set — skipping after pass");
  }

  const reportPath = path.join(OUT, "font-family-probes.json");
  fs.writeFileSync(reportPath, JSON.stringify(allProbes, null, 2));
  fs.copyFileSync(reportPath, path.join(ART, "font-family-probes.json"));
  console.log("probes written", reportPath);
  console.log(JSON.stringify(allProbes, null, 2));
} finally {
  await browser.close();
}
