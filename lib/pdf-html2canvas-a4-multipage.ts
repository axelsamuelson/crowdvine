import type { jsPDF } from "jspdf";
import { PDF_JPEG_QUALITY } from "@/lib/pdf-html2canvas-capture";

export const PDF_A4_WIDTH_MM = 210;
export const PDF_A4_HEIGHT_MM = 297;

export type PdfCanvasEmbedOptions = {
  format?: "JPEG" | "PNG";
  jpegQuality?: number;
};

const DEFAULT_EMBED: Required<Pick<PdfCanvasEmbedOptions, "format" | "jpegQuality">> = {
  format: "JPEG",
  jpegQuality: PDF_JPEG_QUALITY,
};

function canvasToEmbedDataUrl(
  canvas: HTMLCanvasElement,
  options?: PdfCanvasEmbedOptions,
): { dataUrl: string; format: "JPEG" | "PNG" } {
  const format = options?.format ?? DEFAULT_EMBED.format;
  const jpegQuality = options?.jpegQuality ?? DEFAULT_EMBED.jpegQuality;
  if (format === "PNG") {
    return { dataUrl: canvas.toDataURL("image/png"), format: "PNG" };
  }
  return { dataUrl: canvas.toDataURL("image/jpeg", jpegQuality), format: "JPEG" };
}

/**
 * Places a full html2canvas raster on a portrait A4 jsPDF, adding pages when the image is taller than one sheet.
 * Defaults to JPEG embedding for much smaller files than PNG at scale 2.
 */
export function appendCanvasToPdfAsA4Pages(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  embedOptions?: PdfCanvasEmbedOptions,
): void {
  const wMm = PDF_A4_WIDTH_MM;
  const hMm = PDF_A4_HEIGHT_MM;
  const totalHeightMm = (canvas.height * wMm) / canvas.width;
  const pageHeightPx = (hMm / wMm) * canvas.width;

  if (totalHeightMm <= hMm) {
    const { dataUrl, format } = canvasToEmbedDataUrl(canvas, embedOptions);
    pdf.addImage(dataUrl, format, 0, 0, wMm, totalHeightMm);
    return;
  }

  let yPx = 0;
  let isFirstPage = true;
  while (yPx < canvas.height) {
    if (!isFirstPage) pdf.addPage();
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - yPx);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, yPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
    }
    const sliceHeightMm = (sliceHeightPx * wMm) / canvas.width;
    const { dataUrl, format } = canvasToEmbedDataUrl(sliceCanvas, embedOptions);
    pdf.addImage(dataUrl, format, 0, 0, wMm, sliceHeightMm);
    yPx += sliceHeightPx;
    isFirstPage = false;
  }
}
