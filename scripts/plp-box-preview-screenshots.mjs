/**
 * Capture /vin PLP commerce-box stills from a Vercel preview into
 * docs/design-review/plp-box/.
 *
 * Usage:
 *   PREVIEW_URL="https://….vercel.app/?_vercel_share=…" node scripts/plp-box-preview-screenshots.mjs
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("docs/design-review/plp-box");
const ARTIFACT_DIR = path.resolve("/opt/cursor/artifacts/plp-box-screenshots");
for (const d of [OUT_DIR, ARTIFACT_DIR]) fs.mkdirSync(d, { recursive: true });

const previewRaw = process.env.PREVIEW_URL;
if (!previewRaw) {
  console.error("PREVIEW_URL is required");
  process.exit(1);
}

const preview = new URL(previewRaw);
const share = preview.searchParams.get("_vercel_share");
const origin = preview.origin;
const plp = new URL("/vin", origin);
if (share) plp.searchParams.set("_vercel_share", share);

function writeAll(filename, bufferOrPath) {
  for (const dir of [OUT_DIR, ARTIFACT_DIR]) {
    const dest = path.join(dir, filename);
    if (Buffer.isBuffer(bufferOrPath)) fs.writeFileSync(dest, bufferOrPath);
    else fs.copyFileSync(bufferOrPath, dest);
    console.log("wrote", dest);
  }
}

async function setHoverMedia(page, hover) {
  const client = await page.createCDPSession();
  await client.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "hover", value: hover },
      { name: "pointer", value: hover === "none" ? "coarse" : "fine" },
    ],
  });
  return client;
}

async function settle(page, ms = 2000) {
  await new Promise((r) => setTimeout(r, ms));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 200));
}

async function firstCardHandle(page) {
  return page.evaluateHandle(() => {
    const link = document.querySelector('a[href^="/produkt/"]');
    return (
      link?.closest(".group") ||
      link?.closest("[class*='aspect']") ||
      link?.parentElement?.parentElement ||
      link
    );
  });
}

async function screenshot(page, name) {
  const file = path.join(OUT_DIR, name);
  await page.screenshot({ path: file, fullPage: false });
  writeAll(name, file);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

try {
  // Mobile 390: default + first tap
  {
    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      isLandscape: false,
    });
    const client = await setHoverMedia(page, "none");
    await client.send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await page.goto(plp.toString(), {
      waitUntil: "networkidle2",
      timeout: 120000,
    });
    await settle(page, 2500);
    await screenshot(page, "plp-mobile-390.png");

    const card = await firstCardHandle(page);
    const el = card.asElement();
    if (!el) throw new Error("no card for mobile tap");
    const box = await el.boundingBox();
    if (!box) throw new Error("no bbox mobile");
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.4);
    await new Promise((r) => setTimeout(r, 700));
    const revealed = await el.evaluate((g) => ({
      cls: g.classList.contains("is-touch-revealed"),
      opacity: getComputedStyle(
        g.querySelector(".plp-commerce-box--touch"),
      ).opacity,
      text: g.querySelector(".plp-commerce-box--touch")?.textContent || "",
    }));
    if (!revealed.cls || revealed.opacity !== "1") {
      throw new Error(`mobile tap did not reveal box: ${JSON.stringify(revealed)}`);
    }
    if (/Minst 6 flaskor · skickas i låda/i.test(revealed.text)) {
      throw new Error("condition line still present in commerce box");
    }
    await screenshot(page, "plp-mobile-390-tapped.png");
    await page.close();
  }

  // Desktop 1440: default + hover
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await setHoverMedia(page, "hover");
    await page.goto(plp.toString(), {
      waitUntil: "networkidle2",
      timeout: 120000,
    });
    await settle(page, 2500);
    await screenshot(page, "plp-desktop-1440.png");

    const card = await firstCardHandle(page);
    const el = card.asElement();
    if (!el) throw new Error("no card for desktop hover");
    const box = await el.boundingBox();
    if (!box) throw new Error("no bbox desktop");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await new Promise((r) => setTimeout(r, 400));
    await el.evaluate((node) => node.classList.add("plp-force-hover-reveal"));
    await new Promise((r) => setTimeout(r, 300));
    const hoverText = await el.evaluate(
      (g) => g.querySelector(".plp-commerce-box--hover")?.textContent || "",
    );
    if (/Minst 6 flaskor · skickas i låda/i.test(hoverText)) {
      throw new Error("condition line still present in hover commerce box");
    }
    await screenshot(page, "plp-desktop-1440-hover.png");
    await page.close();
  }
} finally {
  await browser.close();
}

console.log("done", { plp: plp.toString(), out: OUT_DIR });
