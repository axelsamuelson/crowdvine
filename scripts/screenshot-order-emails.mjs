import puppeteer from "puppeteer";
import { readdirSync } from "fs";
import path from "path";

const dir = path.resolve("artifacts/order-emails");
const htmlFiles = readdirSync(dir).filter((f) => f.endsWith(".html"));

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

for (const file of htmlFiles) {
  const page = await browser.newPage();
  await page.setViewport({ width: 680, height: 900, deviceScaleFactor: 1 });
  const fileUrl = `file://${path.join(dir, file)}`;
  await page.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  const out = path.join(dir, file.replace(/\.html$/, ".png"));
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
  console.log("shot", out);
}

await browser.close();
console.log("done", htmlFiles.length);
