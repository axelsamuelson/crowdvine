import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateImagePath } from "@/lib/validation/image-validation";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Get all wine images
    const { data: wineImages, error: wineError } = await supabase
      .from("wine_images")
      .select("id, wine_id, image_path, alt_text, created_at");

    if (wineError) {
      return NextResponse.json({ error: wineError.message }, { status: 500 });
    }

    // Get all wines with label_image_path
    const { data: wines, error: winesError } = await supabase
      .from("wines")
      .select("id, wine_name, label_image_path");

    if (winesError) {
      return NextResponse.json({ error: winesError.message }, { status: 500 });
    }

    const healthReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalWineImages: wineImages?.length || 0,
        totalWinesWithLabelImage:
          wines?.filter((w) => w.label_image_path)?.length || 0,
        totalWines: wines?.length || 0,
      },
      wineImages: [],
      wines: [],
      recommendations: [],
    };

    // Check wine_images
    if (wineImages) {
      for (const image of wineImages) {
        const validation = await validateImagePath(image.image_path);
        healthReport.wineImages.push({
          id: image.id,
          wine_id: image.wine_id,
          image_path: image.image_path,
          alt_text: image.alt_text,
          created_at: image.created_at,
          status: validation.exists ? "healthy" : "missing",
          accessible: validation.accessible,
          error: validation.error,
        });
      }
    }

    // Check wines with label_image_path
    if (wines) {
      for (const wine of wines) {
        if (wine.label_image_path) {
          const validation = await validateImagePath(wine.label_image_path);
          healthReport.wines.push({
            id: wine.id,
            wine_name: wine.wine_name,
            label_image_path: wine.label_image_path,
            status: validation.exists ? "healthy" : "missing",
            accessible: validation.accessible,
            error: validation.error,
          });
        }
      }
    }

    // Generate recommendations
    const missingImages = [
      ...healthReport.wineImages.filter((img) => img.status === "missing"),
      ...healthReport.wines.filter((wine) => wine.status === "missing"),
    ];

    if (missingImages.length > 0) {
      healthReport.recommendations.push({
        type: "warning",
        message: `${missingImages.length} images are missing or inaccessible`,
        action: "Consider restoring from backups or re-uploading images",
      });
    }

    const inaccessibleImages = [
      ...healthReport.wineImages.filter((img) => !img.accessible),
      ...healthReport.wines.filter((wine) => !wine.accessible),
    ];

    if (inaccessibleImages.length > 0) {
      healthReport.recommendations.push({
        type: "error",
        message: `${inaccessibleImages.length} images are not accessible`,
        action: "Check image paths and storage configuration",
      });
    }

    // Check for wines without images
    const winesWithoutImages =
      wines?.filter(
        (wine) =>
          !wine.label_image_path &&
          !healthReport.wineImages.some((img) => img.wine_id === wine.id),
      ) || [];

    if (winesWithoutImages.length > 0) {
      healthReport.recommendations.push({
        type: "info",
        message: `${winesWithoutImages.length} wines have no images`,
        action: "Consider adding images for better product presentation",
      });
    }

    // Overall health score
    const totalImages =
      healthReport.summary.totalWineImages +
      healthReport.summary.totalWinesWithLabelImage;
    const healthyImages =
      healthReport.wineImages.filter((img) => img.status === "healthy").length +
      healthReport.wines.filter((wine) => wine.status === "healthy").length;

    healthReport.summary.healthScore =
      totalImages > 0 ? Math.round((healthyImages / totalImages) * 100) : 100;
    healthReport.summary.healthyImages = healthyImages;
    healthReport.summary.missingImages = missingImages.length;
    healthReport.summary.inaccessibleImages = inaccessibleImages.length;

    return NextResponse.json(healthReport);
  } catch (error) {
    console.error("Image health check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check image health",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
