import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const OUT_DIR = path.resolve("docs/design-review/pet-nat-guide");
const URL =
  process.env.PET_NAT_GUIDE_URL ||
  "https://crowdvine-cmje1htz1-avesamuelson-7603s-projects.vercel.app/guider/basta-pet-nat-systembolaget";

const widths = [
  {
    width: 390,
    height: 844,
    name: "pet-nat-guide-390.png",
  },
  {
    width: 1440,
    height: 900,
    name: "pet-nat-guide-1440.png",
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
        document.body?.innerText?.includes("Bästa pet nat på Systembolaget") &&
        document.getElementById("haggan-pet-nat")?.nextElementSibling
          ?.tagName === "DL",
      { timeout: 60_000 },
    );
    await dismissConsent(page);
    await new Promise((r) => setTimeout(r, 400));

    const fontProbe = await page.evaluate(async () => {
      const h1 = document.querySelector("h1");
      if (!h1) return { error: "no h1" };
      const styles = getComputedStyle(h1);
      await document.fonts.ready;
      const faces = Array.from(document.fonts).map((f) => ({
        family: f.family,
        status: f.status,
        weight: f.weight,
        style: f.style,
      }));
      const instrumentLoaded = faces.some(
        (f) =>
          /instrument\s*serif/i.test(f.family) &&
          (f.status === "loaded" || f.status === "loading"),
      );
      return {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        instrumentLoaded,
        instrumentFaces: faces.filter((f) =>
          /instrument/i.test(f.family),
        ),
      };
    });
    console.log("fontProbe", JSON.stringify(fontProbe, null, 2));
    fs.writeFileSync(
      path.join(OUT_DIR, `font-probe-${viewport.width}.json`),
      JSON.stringify(fontProbe, null, 2),
    );

    const fullOut = path.join(OUT_DIR, viewport.name);
    await page.screenshot({ path: fullOut, fullPage: true });
    console.log("wrote", fullOut);

    await page.close();
  }
} finally {
  await browser.close();
}
