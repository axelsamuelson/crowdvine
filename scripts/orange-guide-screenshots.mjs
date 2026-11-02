import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const OUT_DIR = path.resolve("docs/design-review/orange-guide");
const URL =
  process.env.ORANGE_GUIDE_URL ||
  "https://crowdvine-5wt9oxnie-avesamuelson-7603s-projects.vercel.app/guider/basta-orange-naturviner-systembolaget";

const widths = [
  {
    width: 390,
    height: 844,
    name: "orange-guide-390.png",
    crop: "orange-guide-wine-390.png",
  },
  {
    width: 1440,
    height: 900,
    name: "orange-guide-1440.png",
    crop: "orange-guide-wine-1440.png",
  },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome-stable",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

async function dismissConsent(page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    for (const button of buttons) {
      const label = (button.textContent || "").trim().toLowerCase();
      if (
        label.includes("acceptera") ||
        label.includes("accept") ||
        label.includes("godkänn")
      ) {
        button.click();
      }
    }
  });
}

try {
  for (const viewport of widths) {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
    });
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 120_000 });
    await page.waitForFunction(
      () =>
        document.body?.innerText?.includes("Bra orange vin på Systembolaget") &&
        document.getElementById("radikon-ribolla")?.nextElementSibling
          ?.tagName === "DL",
      { timeout: 60_000 },
    );
    await dismissConsent(page);
    await new Promise((r) => setTimeout(r, 400));

    const fullOut = path.join(OUT_DIR, viewport.name);
    await page.screenshot({ path: fullOut, fullPage: true });
    console.log("wrote", fullOut);

    // Crop Radikon heading + its fact dl via element bounding boxes.
    await page.$eval("#radikon-ribolla", (el) => {
      el.scrollIntoView({ block: "center", inline: "nearest" });
    });
    await new Promise((r) => setTimeout(r, 400));

    const boxes = await page.evaluate(() => {
      const heading = document.getElementById("radikon-ribolla");
      if (!heading) return null;
      let dl = heading.nextElementSibling;
      while (dl && dl.tagName !== "DL") dl = dl.nextElementSibling;
      if (!dl) return null;
      const a = heading.getBoundingClientRect();
      const b = dl.getBoundingClientRect();
      const pad = 12;
      return {
        x: Math.max(0, Math.min(a.left, b.left) - pad),
        y: Math.max(0, Math.min(a.top, b.top) - pad),
        width: Math.min(
          window.innerWidth - 4,
          Math.max(a.right, b.right) - Math.min(a.left, b.left) + pad * 2,
        ),
        height: Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top) + pad * 2,
      };
    });

    if (boxes && boxes.width > 40 && boxes.height > 40) {
      const cropOut = path.join(OUT_DIR, viewport.crop);
      await page.screenshot({ path: cropOut, clip: boxes });
      console.log("wrote", cropOut, boxes);
    } else {
      console.error("failed crop for", viewport.crop, boxes);
      process.exitCode = 1;
    }

    await page.close();
  }
} finally {
  await browser.close();
}
