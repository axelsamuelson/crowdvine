/**
 * Browser adapter – Starwinelist scraping uses Chromium (playwright-adapter).
 * On Vercel, @sparticuz/chromium is used (no external API key).
 * Set USE_LOCAL_FETCH=true for plain fetch (dev only; Starwinelist often returns 403 without a browser).
 */

import { BrowserAdapterError } from "./browser-adapter-error";

let loggedOnce = false;

function logAdapterOnce(): void {
  if (loggedOnce) return;
  loggedOnce = true;
  const mode = process.env.USE_LOCAL_FETCH === "true" ? "local_fetch" : "chromium";
  console.warn("[browser-adapter] Using adapter:", mode);
}

/**
 * Fetch fully rendered HTML from URL (Chromium, or plain fetch when USE_LOCAL_FETCH).
 */
export async function fetchRenderedHtml(url: string): Promise<string> {
  logAdapterOnce();
  if (process.env.USE_LOCAL_FETCH === "true") {
    const start = Date.now();
    const res = await fetch(url, { redirect: "follow" });
    const elapsed = Date.now() - start;
    console.warn("[browser-adapter] USE_LOCAL_FETCH HTML", url, res.status, elapsed + "ms");
    if (!res.ok) {
      throw new BrowserAdapterError(`HTTP ${res.status}`, res.status, url);
    }
    return await res.text();
  }
  const { fetchRenderedHtml: playFetch } = await import("./playwright-adapter");
  return playFetch(url);
}

/**
 * Fetch PDF via restaurant page then PDF URL in same browser context (or direct fetch when USE_LOCAL_FETCH).
 */
export async function fetchPdfViaFunction(
  restaurantUrl: string,
  pdfUrl: string
): Promise<Buffer> {
  logAdapterOnce();
  if (process.env.USE_LOCAL_FETCH === "true") {
    const res = await fetch(pdfUrl, { redirect: "follow" });
    if (!res.ok) {
      throw new BrowserAdapterError(`HTTP ${res.status}`, res.status, pdfUrl);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }
  const { fetchPdfViaFunction: playFetch } = await import("./playwright-adapter");
  return playFetch(restaurantUrl, pdfUrl);
}

/**
 * Direct fetch of PDF URL (no browser). Same for all environments.
 */
export async function fetchPdfDirect(pdfUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(pdfUrl, { redirect: "follow" });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/**
 * Which transport is active (for admin UI). Server only.
 */
export function getBrowserAdapterKind(): "chromium" | "local_fetch" {
  return process.env.USE_LOCAL_FETCH === "true" ? "local_fetch" : "chromium";
}
