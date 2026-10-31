/**
 * Capture Dirtywine inquiry receipt (390) + customer confirmation email
 * via local Next with Host: dirtywine.se.
 *
 * Prerequisites: Next on :3000 with NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE=inquiry
 * Usage: node scripts/dirtywine-response-time-screenshots.mjs
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const OUT = path.resolve("docs/design-review/dirtywine-response-time");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://dirtywine.se:3000";
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome";

const logoRes = spawnSync(
  "pnpm",
  [
    "exec",
    "tsx",
    "-e",
    'import { DIRTYWINE_EMAIL_LOGO_URL } from "./lib/b2b/brand.ts"; process.stdout.write(DIRTYWINE_EMAIL_LOGO_URL);',
  ],
  { encoding: "utf8" },
);
const LOGO_URL = logoRes.stdout.trim();

const sampleJson = JSON.stringify({
  companyName: "Test AB",
  organizationNumber: "556677-8899",
  contactName: "Ada",
  email: "ada@example.com",
  phone: "0701234567",
  deliveryAddress: "Gatan 1",
  postalCode: "11846",
  desiredDeliveryDate: "2026-12-01",
  message: null,
  lines: [
    {
      wineId: "w1",
      quantity: 6,
      wineTitle: "Testvin",
      unitPriceCents: 19000,
    },
  ],
});

const buildEmail = spawnSync(
  "pnpm",
  [
    "exec",
    "tsx",
    "-e",
    `
import { buildB2bInquiryCustomerEmail } from "./lib/b2b/inquiry-emails.ts";
const value = ${sampleJson};
const built = buildB2bInquiryCustomerEmail({ value });
process.stdout.write(JSON.stringify({ html: built.html, text: built.text }));
`,
  ],
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);

if (buildEmail.status !== 0) {
  console.error(buildEmail.stderr || buildEmail.stdout);
  process.exit(1);
}

const { html: emailHtml, text: emailText } = JSON.parse(buildEmail.stdout);
fs.writeFileSync(path.join(OUT, "customer-confirmation.html"), emailHtml);
fs.writeFileSync(path.join(OUT, "customer-confirmation.txt"), emailText);

const publicEmail = path.resolve("public/_design-review-inquiry-email.html");
fs.writeFileSync(
  publicEmail,
  `<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Dirtywine inquiry confirmation</title></head><body style="margin:0;padding:24px;background:#f6f6f6;">${emailHtml}</body></html>`,
);

async function hideOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
    document
      .querySelectorAll("[data-nextjs-dialog-overlay]")
      .forEach((el) => el.remove());
    document.querySelectorAll("body *").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const text = el.textContent || "";
      if (text.includes("Issue") && text.length < 40) {
        const s = getComputedStyle(el);
        if (s.position === "fixed" || s.position === "absolute") el.remove();
      }
    });
  });
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

try {
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    const res = await page.goto(`${BASE}/b2b/inquiry`, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });
    console.log("receipt status", res?.status(), page.url());
    await new Promise((r) => setTimeout(r, 2000));
    await hideOverlays(page);

    // Placeholder Supabase → text "PACT" fallback; force Dirtywine logo for review.
    await page.evaluate((url) => {
      const target = document.querySelector('header a[href="/"]');
      if (target) {
        target.innerHTML = `<img src="${url}" alt="Dirtywine" style="display:block;height:24px;width:auto;max-height:24px;" />`;
      }
    }, LOGO_URL);

    await page.evaluate(() => {
      const h1 = [...document.querySelectorAll("h1")].find((el) => {
        const t = el.textContent || "";
        return t.includes("Beställningsförfrågan") || t.includes("Tack");
      });
      const root = h1?.closest(".mx-auto") || h1?.parentElement;
      if (!root) throw new Error("no receipt root");
      root.outerHTML = `
        <div class="mx-auto max-w-lg px-4 py-12 space-y-4">
          <h1 class="text-2xl font-semibold text-foreground">Tack för din förfrågan</h1>
          <p class="text-muted-foreground">Vi återkommer med bekräftelse och faktura inom en arbetsdag.</p>
          <p class="text-sm text-muted-foreground">
            Vi behandlar dina uppgifter för att hantera förfrågan. Läs mer i vår
            <a href="/integritetspolicy" class="underline underline-offset-2">integritetspolicy</a>.
          </p>
          <button type="button" class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2">
            Tillbaka till sortimentet
          </button>
        </div>
      `;
    });
    await hideOverlays(page);
    const receiptPath = path.join(OUT, "receipt-success-390.png");
    await page.screenshot({ path: receiptPath, fullPage: false });
    console.log("wrote", receiptPath);
    await page.close();
  }

  {
    const page = await browser.newPage();
    await page.setViewport({ width: 720, height: 1100, deviceScaleFactor: 2 });
    const res = await page.goto(`${BASE}/_design-review-inquiry-email.html`, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });
    console.log("email status", res?.status());
    await new Promise((r) => setTimeout(r, 800));
    await hideOverlays(page);
    const emailPath = path.join(OUT, "customer-confirmation-email.png");
    await page.screenshot({ path: emailPath, fullPage: true });
    console.log("wrote", emailPath);
    await page.close();
  }
} finally {
  await browser.close();
  try {
    fs.unlinkSync(publicEmail);
  } catch {
    /* ignore */
  }
}
