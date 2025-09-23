import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";
import { validateImage } from "@/lib/validation/image-validation";
import { backupImage } from "@/lib/backup/image-backup";

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

        // Generate unique filename
        const fileExtension = file.name.split(".").pop();
        const fileName = `${randomUUID()}.${fileExtension}`;
        const filePath = `/uploads/${fileName}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create backup first
        try {
          await backupImage(file, filePath);
          console.log(`✅ Backup created for: ${fileName}`);
        } catch (backupError) {
          console.warn(`⚠️ Backup failed for ${fileName}:`, backupError);
          // Continue with upload even if backup fails
        }

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from("uploads")
          .upload(fileName, buffer, {
            contentType: file.type,
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
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          uploadedFiles.push(urlData.publicUrl);
          console.log(`✅ Successfully uploaded: ${fileName}`);
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
      return NextResponse.json(response, { status: 400 });
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
