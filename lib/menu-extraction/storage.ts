import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MENU_PDFS_BUCKET = "menu-pdfs";

export async function ensureMenuPdfsBucket(): Promise<void> {
  const sb = getSupabaseAdmin();
  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === MENU_PDFS_BUCKET);
  if (!exists) {
    const { error } = await sb.storage.createBucket(MENU_PDFS_BUCKET, {
      public: false,
    });
    if (error) {
      console.warn("[menu-storage] Could not create bucket menu-pdfs:", error.message);
    }
  }
}

/**
 * Upload PDF buffer to menu-pdfs/[slug]/[slug]_[date].pdf.
 * Filename includes slug so it's clear which restaurant the file belongs to.
 */
export async function uploadPdfToStorage(
  slug: string,
  buffer: Buffer,
  timestamp: string
): Promise<string> {
  await ensureMenuPdfsBucket();
  const sb = getSupabaseAdmin();
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const datePart = timestamp.replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `${safeSlug}_${datePart}.pdf`;
  const path = `${safeSlug}/${fileName}`;
  const { error } = await sb.storage.from(MENU_PDFS_BUCKET).upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw new Error(`Upload PDF failed: ${error.message}`);
  return path;
}

/**
 * Download a PDF from menu-pdfs storage by path. Returns buffer or null if not found.
 */
export async function getPdfBufferFromStorage(filePath: string): Promise<Buffer | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.storage.from(MENU_PDFS_BUCKET).download(filePath);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
