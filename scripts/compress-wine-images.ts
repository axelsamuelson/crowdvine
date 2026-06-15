/**
 * Batch-compress wine images stored in Supabase (uploads bucket).
 *
 * Usage:
 *   pnpm compress-wine-images          # dry run
 *   pnpm compress-wine-images --execute
 */
import { randomUUID } from "crypto";
import * as dotenv from "dotenv";

import { optimizeUploadImage } from "../lib/images/optimize-upload";
import { getSupabaseAdmin } from "../lib/supabase-admin";

dotenv.config({ path: ".env.development" });
dotenv.config({ path: ".env.local" });

const UPLOAD_CACHE_CONTROL = "31536000";
const MIN_BYTES_TO_OPTIMIZE = 200 * 1024;
const BUCKET = "uploads";

type PathRef = {
  table: "wine_images" | "wines";
  id: string;
  column: "image_path" | "label_image_path";
  rawPath: string;
};

function storageKeyFromPath(path: string): string | null {
  const clean = path.trim().replace(/\n/g, "");
  if (!clean || clean.startsWith("http") && !clean.includes("supabase.co")) {
    return null;
  }

  const uploadsMatch = clean.match(/\/uploads\/([^/?#]+)/);
  if (uploadsMatch?.[1]) return uploadsMatch[1];

  if (clean.startsWith("/uploads/")) {
    return clean.slice("/uploads/".length);
  }

  if (!clean.includes("/") && !clean.startsWith("http")) {
    return clean;
  }

  return null;
}

function isAlreadyOptimized(key: string, size: number, mime: string | null): boolean {
  if (key.endsWith(".webp") && size < MIN_BYTES_TO_OPTIMIZE) return true;
  if (mime === "image/webp" && size < MIN_BYTES_TO_OPTIMIZE) return true;
  return false;
}

async function main() {
  const execute = process.argv.includes("--execute");
  const sb = getSupabaseAdmin();

  const [{ data: wineImages, error: wiErr }, { data: wines, error: wErr }] =
    await Promise.all([
      sb.from("wine_images").select("id, wine_id, image_path"),
      sb.from("wines").select("id, label_image_path").not("label_image_path", "is", null),
    ]);

  if (wiErr) throw new Error(`wine_images: ${wiErr.message}`);
  if (wErr) throw new Error(`wines: ${wErr.message}`);

  const byKey = new Map<string, PathRef[]>();

  for (const row of wineImages ?? []) {
    const key = storageKeyFromPath(row.image_path ?? "");
    if (!key) continue;
    const refs = byKey.get(key) ?? [];
    refs.push({
      table: "wine_images",
      id: row.id,
      column: "image_path",
      rawPath: row.image_path,
    });
    byKey.set(key, refs);
  }

  for (const row of wines ?? []) {
    const path = row.label_image_path as string;
    const key = storageKeyFromPath(path);
    if (!key) continue;
    const refs = byKey.get(key) ?? [];
    refs.push({
      table: "wines",
      id: row.id,
      column: "label_image_path",
      rawPath: path,
    });
    byKey.set(key, refs);
  }

  console.log(`Found ${byKey.size} unique storage objects referenced by wines.`);

  let optimized = 0;
  let skipped = 0;
  let failed = 0;
  let savedBytes = 0;

  for (const [storageKey, refs] of byKey) {
    try {
      const { data: blob, error: dlErr } = await sb.storage
        .from(BUCKET)
        .download(storageKey);

      if (dlErr || !blob) {
        console.warn(`  skip (missing): ${storageKey} — ${dlErr?.message ?? "no data"}`);
        skipped++;
        continue;
      }

      const originalBuffer = Buffer.from(await blob.arrayBuffer());
      const mime = blob.type || "application/octet-stream";

      if (isAlreadyOptimized(storageKey, originalBuffer.length, mime)) {
        skipped++;
        continue;
      }

      if (
        originalBuffer.length < MIN_BYTES_TO_OPTIMIZE &&
        !storageKey.endsWith(".png")
      ) {
        skipped++;
        continue;
      }

      const result = await optimizeUploadImage(originalBuffer, mime);
      if (result.buffer.length >= originalBuffer.length * 0.95) {
        console.log(`  skip (no gain): ${storageKey}`);
        skipped++;
        continue;
      }

      const newKey = `${randomUUID()}.${result.extension}`;
      const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(newKey);
      const newPublicUrl = urlData.publicUrl;

      console.log(
        `${execute ? "→" : "[dry]"} ${storageKey}: ${(originalBuffer.length / 1024).toFixed(0)} KiB → ${(result.buffer.length / 1024).toFixed(0)} KiB (${refs.length} refs)`,
      );

      if (!execute) {
        savedBytes += originalBuffer.length - result.buffer.length;
        optimized++;
        continue;
      }

      const { error: upErr } = await sb.storage.from(BUCKET).upload(newKey, result.buffer, {
        contentType: result.contentType,
        cacheControl: UPLOAD_CACHE_CONTROL,
        upsert: false,
      });

      if (upErr) {
        console.error(`  upload failed: ${storageKey}`, upErr.message);
        failed++;
        continue;
      }

      for (const ref of refs) {
        const newPath = ref.rawPath.includes("supabase.co")
          ? newPublicUrl
          : `/uploads/${newKey}`;

        if (ref.table === "wine_images") {
          const { error } = await sb
            .from("wine_images")
            .update({ image_path: newPath })
            .eq("id", ref.id);
          if (error) throw new Error(`wine_images ${ref.id}: ${error.message}`);
        } else {
          const { error } = await sb
            .from("wines")
            .update({ label_image_path: newPath })
            .eq("id", ref.id);
          if (error) throw new Error(`wines ${ref.id}: ${error.message}`);
        }
      }

      savedBytes += originalBuffer.length - result.buffer.length;
      optimized++;
    } catch (err) {
      console.error(`  error: ${storageKey}`, err);
      failed++;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}`);
  console.log(`Optimized: ${optimized}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Est. saved: ${(savedBytes / 1024 / 1024).toFixed(2)} MiB`);
  if (!execute && optimized > 0) {
    console.log("\nRe-run with --execute to apply changes.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
