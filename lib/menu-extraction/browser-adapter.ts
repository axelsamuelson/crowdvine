/**
 * Browser adapter factory – chooses Playwright (local) or Browserless (hosted) by env.
 * Starwinelist-scraper imports only from here; it does not know which implementation runs.
 * Exports BrowserlessError so crawler (unchanged) continues to detect 429 via instanceof.
 */

import { BrowserAdapterError } from "./browser-adapter-error";
import { BrowserlessError } from "./browserless-adapter";

export { BrowserlessError };

type AdapterKind = "playwright" | "browserless";

let loggedAdapter: AdapterKind | null = null;

function getAdapter(): AdapterKind {
  const v = process.env.BROWSER_ADAPTER?.trim().toLowerCase();
  if (v === "playwright") return "playwright";
  return "browserless";
}

function logAdapterOnce(): void {
  if (loggedAdapter !== null) return;
  loggedAdapter = getAdapter();
  console.warn("[browser-adapter] Using adapter:", loggedAdapter);
}

function wrapPlaywrightError(e: unknown, url: string): never {
  if (e instanceof BrowserAdapterError) {
    throw new BrowserlessError(e.message, e.status, e.url);
  }
  throw e;
}

/**
 * Fetch fully rendered HTML from URL (Playwright or Browserless).
 */
export async function fetchRenderedHtml(url: string): Promise<string> {
  logAdapterOnce();
  const adapter = getAdapter();
  if (adapter === "playwright") {
    try {
      const { fetchRenderedHtml: playFetch } = await import("./playwright-adapter");
      return await playFetch(url);
    } catch (e) {
      wrapPlaywrightError(e, url);
    }
  }
  const { fetchRenderedHtml: browserlessFetch } = await import("./browserless-adapter");
  return browserlessFetch(url);
}

/**
 * Fetch PDF via restaurant page then PDF URL in same browser context (Playwright or Browserless).
 */
export async function fetchPdfViaFunction(
  restaurantUrl: string,
  pdfUrl: string
): Promise<Buffer> {
  logAdapterOnce();
  const adapter = getAdapter();
  if (adapter === "playwright") {
    try {
      const { fetchPdfViaFunction: playFetch } = await import("./playwright-adapter");
      return await playFetch(restaurantUrl, pdfUrl);
    } catch (e) {
      wrapPlaywrightError(e, pdfUrl);
    }
  }
  const { fetchPdfViaFunction: browserlessFetch } = await import("./browserless-adapter");
  return browserlessFetch(restaurantUrl, pdfUrl);
}

/**
 * Direct fetch of PDF URL (no browser). Same for all adapters.
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
 * Which adapter is active (for admin UI). Call from server only.
 */
export function getBrowserAdapterKind(): "playwright" | "browserless" {
  return getAdapter();
}
