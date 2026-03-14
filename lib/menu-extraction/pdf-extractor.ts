/**
 * @deprecated PDF text extraction is no longer used in the main pipeline.
 * Claude API reads PDFs directly via document blocks.
 * This file is kept for potential fallback or OCR use cases.
 * TODO(menu-extraction): Remove if no longer needed after validation.
 *
 * Extract raw text from PDF buffers for menu extraction.
 * Uses pdf-parse (PDFParse); never throws – returns null on failure or empty text.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse") as { PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text?: string; numpages?: number }> } };

/**
 * Extract text from a PDF buffer. Returns null if empty or extraction fails.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string | null> {
  try {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    const numpages = typeof data?.numpages === "number" ? data.numpages : 0;
    if (text.length > 0) {
      console.log("[pdf-extractor] Extracted", text.length, "chars from PDF (" + numpages + " pages)");
      return text;
    }
    console.warn("[pdf-extractor] WARNING: No text extracted – possibly scanned PDF");
    return null;
  } catch (err) {
    console.warn("[pdf-extractor] Extraction failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
