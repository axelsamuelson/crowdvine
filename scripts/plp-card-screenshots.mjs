/**
 * Capture pactwines.com PLP/PDP stills + short interaction recording.
 * Usage: node scripts/plp-card-screenshots.mjs [after]
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";

const pass = process.argv[2] || "after";
const OUT_DIRS = [
  path.resolve("docs/design-review/plp-card"),
  path.resolve("/opt/cursor/artifacts/plp-card-screenshots"),
];
for (const d of OUT_DIRS) fs.mkdirSync(d, { recursive: true });

const BASE = "http://pactwines.com:3000";
const PLP = `${BASE}/vin`;
const PDP = `${BASE}/produkt/l-2023`;

function writeAll(filename, bufferOrPath) {
  for (const dir of OUT_DIRS) {
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
  const file = path.join(OUT_DIRS[0], name);
  await page.screenshot({ path: file, fullPage: false });
  writeAll(name, file);
}

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

try {
  // --- Mobile 390: real touch emulation (not just a narrow desktop viewport) ---
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
    await page.goto(PLP, { waitUntil: "networkidle2", timeout: 120000 });
    await settle(page, 2500);
    await screenshot(page, `${pass}-plp-mobile-390.png`);

    const card = await firstCardHandle(page);
    const el = card.asElement();
    if (!el) throw new Error("no card for mobile tap");
    const box = await el.boundingBox();
    if (!box) throw new Error("no bbox mobile");
    // First tap reveals overlay (touch / hover:none)
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.4);
    await new Promise((r) => setTimeout(r, 700));
    const revealed = await el.evaluate((g) => ({
      cls: g.classList.contains("is-touch-revealed"),
      opacity: getComputedStyle(
        g.querySelector(".plp-commerce-box--touch"),
      ).opacity,
    }));
    if (!revealed.cls || revealed.opacity !== "1") {
      throw new Error(`mobile tap did not reveal box: ${JSON.stringify(revealed)}`);
    }
    await screenshot(page, `${pass}-plp-mobile-390-tapped.png`);
    await page.close();
  }

  // --- Desktop 1440: default + hover ---
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await setHoverMedia(page, "hover");
    await page.goto(PLP, { waitUntil: "networkidle2", timeout: 120000 });
    await settle(page, 2500);
    await screenshot(page, `${pass}-plp-desktop-1440.png`);

    const card = await firstCardHandle(page);
    const el = card.asElement();
    if (!el) throw new Error("no card for desktop hover");
    const box = await el.boundingBox();
    if (!box) throw new Error("no bbox desktop");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await new Promise((r) => setTimeout(r, 400));
    // Headless often reports (hover:none). Reveal ONLY this card — never the whole grid.
    await el.evaluate((node) => node.classList.add("plp-force-hover-reveal"));
    await new Promise((r) => setTimeout(r, 300));
    await screenshot(page, `${pass}-plp-desktop-1440-hover.png`);
    await page.close();
  }

  // --- PDP both widths ---
  for (const vp of [
    { label: "mobile-390", width: 390, height: 844, hover: "none", pointer: "coarse" },
    { label: "desktop-1440", width: 1440, height: 900, hover: "hover", pointer: "fine" },
  ]) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
    });
    await setHoverMedia(page, vp.hover);
    await page.goto(PDP, { waitUntil: "networkidle2", timeout: 120000 });
    await settle(page, 2500);
    await screenshot(page, `${pass}-pdp-${vp.label}.png`);
    await page.close();
  }

  // --- Short recording: desktop hover then mobile tap (<10s) ---
  {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "plp-rec-"));
    const frames = [];
    let frameIdx = 0;

    async function recordPage(setup) {
      const page = await browser.newPage();
      await setup(page);
      const client = await page.createCDPSession();
      await client.send("Page.startScreencast", {
        format: "jpeg",
        quality: 55,
        maxWidth: 1440,
        maxHeight: 900,
        everyNthFrame: 1,
      });
      const onFrame = async (params) => {
        const file = path.join(
          tmp,
          `frame-${String(frameIdx).padStart(5, "0")}.jpg`,
        );
        frameIdx += 1;
        await writeFile(file, Buffer.from(params.data, "base64"));
        frames.push(file);
        await client.send("Page.screencastFrameAck", {
          sessionId: params.sessionId,
        });
      };
      client.on("Page.screencastFrame", onFrame);
      return { page, client, stop: async () => {
        try {
          await client.send("Page.stopScreencast");
        } catch {}
        client.off("Page.screencastFrame", onFrame);
        await page.close();
      } };
    }

    // Desktop hover (~4s)
    {
      const rec = await recordPage(async (page) => {
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
        await setHoverMedia(page, "hover");
        await page.goto(PLP, { waitUntil: "networkidle2", timeout: 120000 });
        await settle(page, 1500);
      });
      await new Promise((r) => setTimeout(r, 400));
      const card = await firstCardHandle(rec.page);
      const el = card.asElement();
      const box = await el.boundingBox();
      await rec.page.mouse.move(box.x + 10, box.y + 10);
      await new Promise((r) => setTimeout(r, 300));
      await rec.page.mouse.move(
        box.x + box.width / 2,
        box.y + box.height / 2,
        { steps: 12 },
      );
      await el.evaluate((node) => node.classList.add("plp-force-hover-reveal"));
      await new Promise((r) => setTimeout(r, 2200));
      await el.evaluate((node) =>
        node.classList.remove("plp-force-hover-reveal"),
      );
      await rec.page.mouse.move(20, 20, { steps: 8 });
      await new Promise((r) => setTimeout(r, 600));
      await rec.stop();
    }

    // Mobile tap (~4s)
    {
      const rec = await recordPage(async (page) => {
        await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
        await setHoverMedia(page, "none");
        await page.goto(PLP, { waitUntil: "networkidle2", timeout: 120000 });
        await settle(page, 1500);
      });
      await new Promise((r) => setTimeout(r, 400));
      const card = await firstCardHandle(rec.page);
      const el = card.asElement();
      const box = await el.boundingBox();
      await new Promise((r) => setTimeout(r, 400));
      await rec.page.touchscreen.tap(
        box.x + box.width / 2,
        box.y + box.height * 0.55,
      );
      await new Promise((r) => setTimeout(r, 2000));
      await rec.stop();
    }

    if (frames.length < 5) {
      console.warn("few frames", frames.length);
    }

    const listFile = path.join(tmp, "frames.txt");
    // Rebuild contiguous numbered sequence for ffmpeg
    const seqDir = path.join(tmp, "seq");
    fs.mkdirSync(seqDir);
    frames.forEach((f, i) => {
      fs.copyFileSync(f, path.join(seqDir, `f-${String(i).padStart(5, "0")}.jpg`));
    });

    const outMp4 = path.join(OUT_DIRS[0], `${pass}-plp-interaction.mp4`);
    await new Promise((resolve, reject) => {
      const ff = spawn(
        "ffmpeg",
        [
          "-y",
          "-framerate",
          "10",
          "-i",
          path.join(seqDir, "f-%05d.jpg"),
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "-t",
          "9",
          outMp4,
        ],
        { stdio: "inherit" },
      );
      ff.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg " + code))));
    });
    writeAll(`${pass}-plp-interaction.mp4`, outMp4);
    await rm(tmp, { recursive: true, force: true });
  }
} finally {
  await browser.close();
}

console.log("done");
