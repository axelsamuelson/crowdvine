/**
 * Browser adapter – routes Starwinelist requests to the best available transport:
 * 1. USE_LOCAL_FETCH (dev plain fetch)
 * 2. Browserless /unblock when BROWSERLESS_API_KEY is set (Cloudflare bypass)
 * 3. Headless Chromium via playwright-core (fallback; often blocked on Vercel)
 */

import { BrowserAdapterError } from "./browser-adapter-error";

let loggedOnce = false;

function useLocalFetch(): boolean {
  return process.env.USE_LOCAL_FETCH === "true";
}

function useBrowserless(): boolean {
  return Boolean(process.env.BROWSERLESS_API_KEY?.trim());
}

function logAdapterOnce(): void {
  if (loggedOnce) return;
  loggedOnce = true;
  const mode = useLocalFetch()
    ? "local_fetch"
    : useBrowserless()
      ? "browserless"
      : "chromium";
  console.warn("[browser-adapter] Using adapter:", mode);
}

export async function fetchRenderedHtml(url: string): Promise<string> {
  logAdapterOnce();
  if (useLocalFetch()) {
    const start = Date.now();
    const res = await fetch(url, { redirect: "follow" });
    console.warn("[browser-adapter] USE_LOCAL_FETCH HTML", url, res.status, Date.now() - start + "ms");
    if (!res.ok) {
      throw new BrowserAdapterError(`HTTP ${res.status}`, res.status, url);
    }
    return await res.text();
  }
  if (useBrowserless()) {
    const { fetchRenderedHtml: blFetch } = await import("./browserless-adapter");
    return blFetch(url);
  }
  const { fetchRenderedHtml: playFetch } = await import("./playwright-adapter");
  return playFetch(url);
}

export async function fetchPdfViaFunction(
  restaurantUrl: string,
  pdfUrl: string,
): Promise<Buffer> {
  logAdapterOnce();
  if (useLocalFetch()) {
    const res = await fetch(pdfUrl, { redirect: "follow" });
    if (!res.ok) {
      throw new BrowserAdapterError(`HTTP ${res.status}`, res.status, pdfUrl);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  if (useBrowserless()) {
    const { fetchPdfViaFunction: blFetch } = await import("./browserless-adapter");
    return blFetch(restaurantUrl, pdfUrl);
  }
  const { fetchPdfViaFunction: playFetch } = await import("./playwright-adapter");
  return playFetch(restaurantUrl, pdfUrl);
}

export async function fetchPdfDirect(pdfUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(pdfUrl, { redirect: "follow" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export function getBrowserAdapterKind(): "browserless" | "chromium" | "local_fetch" {
  if (useLocalFetch()) return "local_fetch";
  if (useBrowserless()) return "browserless";
  return "chromium";
}
