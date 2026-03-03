/**
 * Wine tasting PDF export – same approach as invoice: render HTML with real <img>,
 * then html2canvas to capture (so images are included), then jsPDF.
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export type { TastingPdfWine, TastingPdfSession } from "@/components/admin/tasting-pdf-template";

export interface TastingPdfData {
  session: { name: string; created_at?: string; completed_at?: string | null };
  wines: Array<{
    wine_name: string;
    vintage: string;
    grape_varieties?: string | null;
    label_image_path?: string | null;
    producer_name?: string | null;
    b2b_price_excl_vat?: number | null;
    base_price_cents?: number | null;
    price_includes_vat?: boolean | null;
  }>;
}

export async function fetchTastingPdfData(sessionId: string): Promise<TastingPdfData> {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${baseUrl}/api/wine-tastings/${sessionId}/summary`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Kunde inte hämta vinlistan");
  const data = await res.json();
  const session = data.session ?? {};
  const wines = (data.wines ?? []).map((item: { wine: TastingPdfData["wines"][0] }) => item.wine);
  return { session, wines };
}

/** Wait until all images inside the element have loaded (or failed) */
export function waitForImages(element: HTMLElement): Promise<void> {
  const imgs = element.querySelectorAll("img");
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    Array.from(imgs).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  ).then(() => {});
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Capture the given element with html2canvas (same as invoice) and save as PDF.
 * If content is taller than one page, splits into multiple pages.
 */
export async function captureTastingPdfToDownload(
  element: HTMLElement,
  fileName: string,
): Promise<void> {
  await waitForImages(element);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const totalHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;
  const pageHeightPx = (A4_HEIGHT_MM / A4_WIDTH_MM) * canvas.width;

  if (totalHeightMm <= A4_HEIGHT_MM) {
    const imgData = canvas.toDataURL("image/png");
    const imgHeightMm = totalHeightMm;
    pdf.addImage(imgData, "PNG", 0, 0, A4_WIDTH_MM, imgHeightMm);
  } else {
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
      const imgData = sliceCanvas.toDataURL("image/png");
      const sliceHeightMm = (sliceHeightPx * A4_WIDTH_MM) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, A4_WIDTH_MM, sliceHeightMm);
      yPx += sliceHeightPx;
      isFirstPage = false;
    }
  }

  pdf.save(fileName);
}
