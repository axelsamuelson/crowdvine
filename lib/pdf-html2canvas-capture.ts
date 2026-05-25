/** ~150 DPI raster width for A4 (210 mm) — sharp enough for invoices, small enough for email. */
export const PDF_CAPTURE_TARGET_WIDTH_PX = 1240;

/** JPEG quality for embedded invoice/tasting PDF images (0–1). */
export const PDF_JPEG_QUALITY = 0.82;

export function getHtml2CanvasPdfScale(element: HTMLElement): number {
  const width = element.getBoundingClientRect().width || element.offsetWidth;
  if (width <= 0) return 1.25;
  const scale = PDF_CAPTURE_TARGET_WIDTH_PX / width;
  return Math.min(1.75, Math.max(1, Math.round(scale * 100) / 100));
}

export const html2canvasPdfBaseOptions = {
  useCORS: true,
  logging: false,
  backgroundColor: "#ffffff",
} as const;
