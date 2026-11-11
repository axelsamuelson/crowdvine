/**
 * Shared signals for hiding the mobile PDP sticky buy bar while overlays are open.
 * Cart drawer sets data-cart-drawer-open; mix sheet sets data-mix-box-open;
 * cookie banners are detected via known third-party / local selectors (read-only).
 */

export const CART_DRAWER_OPEN_ATTR = "data-cart-drawer-open";
export const MIX_BOX_OPEN_ATTR = "data-mix-box-open";

/**
 * Known cookie / consent UI selectors — observe only; do not mutate.
 * Prefer direct children of `body` (cheap); do not walk the whole tree.
 */
export const COOKIE_BANNER_SELECTORS = [
  "#CybotCookiebotDialog",
  "#cookie-banner",
  "[data-cookie-banner]",
  "[data-testid='cookie-banner']",
  ".cky-consent-container",
  "#onetrust-banner-sdk",
  ".cc-window",
] as const;

export function setDocumentFlag(
  attr: string,
  open: boolean,
  root: HTMLElement = document.documentElement,
): void {
  if (open) root.setAttribute(attr, "true");
  else root.removeAttribute(attr);
}

export function isDocumentFlagOpen(
  attr: string,
  root: HTMLElement = document.documentElement,
): boolean {
  return root.getAttribute(attr) === "true";
}

/**
 * Cheap visibility check — no getComputedStyle. Relies on layout boxes.
 * Hidden via display:none / zero size / off-DOM return false.
 */
function isElementLaidOut(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hidden) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Detect an open cookie / consent banner without walking the document tree.
 * Only checks `body` children + id lookups (O(children), no subtree).
 */
export function isCookieBannerOpen(
  body: ParentNode | null | undefined =
    typeof document !== "undefined" ? document.body : null,
): boolean {
  if (!body || typeof document === "undefined") return false;

  for (const sel of COOKIE_BANNER_SELECTORS) {
    try {
      // id selectors are O(1); attribute/class only scan body children.
      if (sel.startsWith("#")) {
        const byId = document.getElementById(sel.slice(1));
        if (byId && isElementLaidOut(byId)) return true;
        continue;
      }
      for (const child of Array.from(body.childNodes)) {
        if (!(child instanceof Element)) continue;
        if (child.matches(sel) && isElementLaidOut(child)) return true;
      }
    } catch {
      // Invalid selector in older engines — ignore.
    }
  }
  return false;
}

/**
 * Observe `body` childList only (no subtree). Debounces callback.
 * Returns a disconnect function.
 */
export function observeBodyChildList(
  onChange: () => void,
  debounceMs = 100,
): () => void {
  if (typeof document === "undefined" || !document.body) {
    return () => {};
  }
  let timer = 0;
  const schedule = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = 0;
      onChange();
    }, debounceMs);
  };
  const mo = new MutationObserver(schedule);
  mo.observe(document.body, { childList: true, subtree: false });
  return () => {
    if (timer) window.clearTimeout(timer);
    mo.disconnect();
  };
}

/**
 * Heuristic for on-screen keyboard: visual viewport much shorter than layout viewport.
 */
export function isOnScreenKeyboardOpen(
  vv: Pick<VisualViewport, "height"> | null | undefined = typeof window !==
  "undefined"
    ? window.visualViewport
    : null,
  layoutHeight: number = typeof window !== "undefined" ? window.innerHeight : 0,
): boolean {
  if (!vv || layoutHeight <= 0) return false;
  return layoutHeight - vv.height > 120;
}

/** Split a trailing 4-digit vintage from a wine title for sticky truncation. */
export function splitTitleAndVintage(title: string): {
  name: string;
  vintage: string | null;
} {
  const trimmed = String(title || "").trim();
  const match = trimmed.match(/^(.*?)(?:\s+)(\d{4})$/);
  if (!match) return { name: trimmed, vintage: null };
  const name = match[1].trim();
  const vintage = match[2];
  if (!name) return { name: trimmed, vintage: null };
  return { name, vintage };
}

/**
 * Main CTA has scrolled *above* the viewport (past the button), not merely
 * "not yet reached" below the fold. Uses rootMargin -8px: treat bottom < 0
 * (or top < 0) as scrolled past.
 */
export function isMainCtaScrolledPast(
  entry: Pick<IntersectionObserverEntry, "isIntersecting" | "boundingClientRect">,
): boolean {
  if (entry.isIntersecting) return false;
  const { top, bottom } = entry.boundingClientRect;
  return bottom < 0 || top < 0;
}
