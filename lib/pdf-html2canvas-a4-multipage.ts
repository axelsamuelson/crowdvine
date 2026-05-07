import type { jsPDF } from "jspdf";

export const PDF_A4_WIDTH_MM = 210;
export const PDF_A4_HEIGHT_MM = 297;

/**
 * Places a full html2canvas raster on a portrait A4 jsPDF, adding pages when the image is taller than one sheet.
 */
export function appendCanvasToPdfAsA4Pages(pdf: jsPDF, canvas: HTMLCanvasElement): void {
  const wMm = PDF_A4_WIDTH_MM;
  const hMm = PDF_A4_HEIGHT_MM;
  const totalHeightMm = (canvas.height * wMm) / canvas.width;
  const pageHeightPx = (hMm / wMm) * canvas.width;

  if (totalHeightMm <= hMm) {
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, wMm, totalHeightMm);
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
    pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, wMm, sliceHeightMm);
    yPx += sliceHeightPx;
    isFirstPage = false;
  }
}
