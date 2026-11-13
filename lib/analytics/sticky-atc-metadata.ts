/**
 * Privacy-safe metadata for sticky_atc_shown / sticky_atc_clicked.
 * No PII — only wine_id, scroll ratio, viewport label, and CTA visibility.
 */

export type StickyAtcMetadata = {
  main_cta_hidden: boolean;
  /** Document scroll progress 0–1. */
  scroll_depth: number;
  /** e.g. "mobile:390" */
  viewport: string;
  wine_id: string;
};

export function clampScrollDepth(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.min(1, Math.max(0, raw));
}

export function readDocumentScrollDepth(
  doc: Pick<Document, "documentElement"> = document,
): number {
  const el = doc.documentElement;
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 0) return 0;
  return clampScrollDepth(el.scrollTop / max);
}

export function stickyAtcViewportLabel(
  widthPx: number,
  isMobileLayout: boolean,
): string {
  const w = Math.max(0, Math.round(widthPx));
  return `${isMobileLayout ? "mobile" : "desktop"}:${w}`;
}

export function buildStickyAtcMetadata(input: {
  wineId: string;
  mainCtaHidden: boolean;
  scrollDepth?: number;
  widthPx?: number;
  isMobileLayout?: boolean;
}): StickyAtcMetadata {
  const widthPx =
    typeof input.widthPx === "number"
      ? input.widthPx
      : typeof window !== "undefined"
        ? window.innerWidth
        : 0;
  const isMobileLayout =
    typeof input.isMobileLayout === "boolean"
      ? input.isMobileLayout
      : widthPx < 768;
  const scrollDepth =
    typeof input.scrollDepth === "number"
      ? clampScrollDepth(input.scrollDepth)
      : typeof document !== "undefined"
        ? readDocumentScrollDepth()
        : 0;

  return {
    main_cta_hidden: Boolean(input.mainCtaHidden),
    scroll_depth: scrollDepth,
    viewport: stickyAtcViewportLabel(widthPx, isMobileLayout),
    wine_id: String(input.wineId || ""),
  };
}
