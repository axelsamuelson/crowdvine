/**
 * Shared signals for hiding the mobile PDP sticky buy bar while overlays are open.
 * Cart drawer sets data-cart-drawer-open; mix sheet sets data-mix-box-open;
 * cookie banners are detected via known third-party / local selectors (read-only).
 */

export const CART_DRAWER_OPEN_ATTR = "data-cart-drawer-open";
export const MIX_BOX_OPEN_ATTR = "data-mix-box-open";

/** Known cookie / consent UI selectors — observe only; do not mutate. */
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

function isElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function isCookieBannerOpen(
  root: ParentNode = document,
): boolean {
  for (const sel of COOKIE_BANNER_SELECTORS) {
    try {
      const nodes = root.querySelectorAll(sel);
      for (const node of nodes) {
        if (isElementVisible(node)) return true;
      }
    } catch {
      // Invalid selector in older engines — ignore.
    }
  }
  return false;
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
