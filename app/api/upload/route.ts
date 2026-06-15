import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { backupImage } from "@/lib/backup/image-backup";
import { optimizeUploadImage } from "@/lib/images/optimize-upload";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateImage } from "@/lib/validation/image-validation";

const UPLOAD_CACHE_CONTROL = "31536000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedFiles: string[] = [];
    const uploadErrors: string[] = [];
    const supabase = getSupabaseAdmin();

    for (const file of files) {
      try {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          uploadErrors.push(`${file.name}: Not an image file`);
          continue;
        }

        // Validate image
        const validation = await validateImage(file);
        if (!validation.isValid) {
          uploadErrors.push(`${file.name}: ${validation.errors.join(", ")}`);
          continue;
        }

        // Log warnings
        if (validation.warnings.length > 0) {
          console.warn(`${file.name} warnings:`, validation.warnings);
        }

        const fileExtension = file.name.split(".").pop() || "jpg";
        const backupFileName = `${randomUUID()}.${fileExtension}`;
        const filePath = `/uploads/${backupFileName}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const originalBuffer = Buffer.from(bytes);

        // Create backup first (original bytes)
        try {
          await backupImage(file, filePath);
          console.log(`✅ Backup created for: ${backupFileName}`);
        } catch (backupError) {
          console.warn(`⚠️ Backup failed for ${backupFileName}:`, backupError);
          // Continue with upload even if backup fails
        }

        const optimized = await optimizeUploadImage(originalBuffer, file.type);
        const uploadFileName = `${randomUUID()}.${optimized.extension}`;

        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from("uploads")
          .upload(uploadFileName, optimized.buffer, {
            contentType: optimized.contentType,
            cacheControl: UPLOAD_CACHE_CONTROL,
            upsert: false,
          });

        if (error) {
          console.error("Supabase upload error:", error);
          uploadErrors.push(`${file.name}: Upload failed - ${error.message}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("uploads")
          .getPublicUrl(uploadFileName);

        if (urlData?.publicUrl) {
          uploadedFiles.push(urlData.publicUrl);
          console.log(`✅ Successfully uploaded: ${uploadFileName}`);
        } else {
          uploadErrors.push(`${file.name}: Failed to get public URL`);
        }
      } catch (fileError) {
        console.error(`Error processing ${file.name}:`, fileError);
        uploadErrors.push(
          `${file.name}: ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
        );
      }
    }

    // Return results
    const response: any = {
      success: uploadedFiles.length > 0,
      files: uploadedFiles,
    };

    if (uploadErrors.length > 0) {
      response.errors = uploadErrors;
      response.partialSuccess =
        uploadedFiles.length > 0 && uploadErrors.length > 0;
    }

    if (uploadedFiles.length === 0) {
      const errorMessage =
        uploadErrors.length > 0
          ? uploadErrors.join("; ")
          : "No files could be uploaded";
      return NextResponse.json(
        { ...response, error: errorMessage },
        { status: 400 },
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload files",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
