import sharp from "sharp";

const MAX_EDGE_PX = 1200;
const WEBP_QUALITY = 82;

export type OptimizedUpload = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

/** Resize and convert raster uploads to WebP for smaller Supabase payloads. */
export async function optimizeUploadImage(
  buffer: Buffer,
  mimeType: string,
): Promise<OptimizedUpload> {
  if (mimeType === "image/svg+xml" || mimeType === "image/gif") {
    const extension = mimeType === "image/svg+xml" ? "svg" : "gif";
    return { buffer, contentType: mimeType, extension };
  }

  let pipeline = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (width > MAX_EDGE_PX || height > MAX_EDGE_PX) {
    pipeline = pipeline.resize(MAX_EDGE_PX, MAX_EDGE_PX, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const optimized = await pipeline
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  return {
    buffer: optimized,
    contentType: "image/webp",
    extension: "webp",
  };
}
