"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { WineImage, CreateWineImageData } from "@/lib/types/wine-images";

export async function getWineImages(wineId: string): Promise<WineImage[]> {
  const sb = await supabaseServer();

  try {
    const { data: images, error } = await sb
      .from("wine_images")
      .select("*")
      .eq("wine_id", wineId)
      .order("sort_order", { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === "PGRST205" || error.message.includes("wine_images")) {
        console.warn("wine_images table not found, returning empty array");
        return [];
      }
      throw new Error(error.message);
    }
    return images || [];
  } catch (error) {
    console.warn("Error fetching wine images:", error);
    return [];
  }
}

export async function createWineImage(
  data: CreateWineImageData,
): Promise<WineImage> {
  const sb = await supabaseServer();

  try {
    // If this is set as primary, unset other primary images for this wine
    if (data.is_primary) {
      await sb
        .from("wine_images")
        .update({ is_primary: false })
        .eq("wine_id", data.wine_id);
    }

    const { data: image, error } = await sb
      .from("wine_images")
      .insert(data)
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST205" || error.message.includes("wine_images")) {
        throw new Error(
          "wine_images table not found. Please create the table first.",
        );
      }
      throw new Error(error.message);
    }

    revalidatePath(`/admin/wines/${data.wine_id}`);
    revalidatePath(`/product/${data.wine_id}`);
    return image;
  } catch (error) {
    console.error("Error creating wine image:", error);
    throw error;
  }
}

export async function updateWineImage(
  id: string,
  data: Partial<CreateWineImageData>,
): Promise<WineImage> {
  const sb = await supabaseServer();

  // If this is set as primary, unset other primary images for this wine
  if (data.is_primary) {
    const { data: currentImage } = await sb
      .from("wine_images")
      .select("wine_id")
      .eq("id", id)
      .single();

    if (currentImage) {
      await sb
        .from("wine_images")
        .update({ is_primary: false })
        .eq("wine_id", currentImage.wine_id)
        .neq("id", id);
    }
  }

  const { data: image, error } = await sb
    .from("wine_images")
    .update(data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/wines/${image.wine_id}`);
  revalidatePath(`/product/${image.wine_id}`);
  return image;
}

export async function deleteWineImage(id: string): Promise<void> {
  const sb = await supabaseServer();

  // Get wine_id before deleting
  const { data: image } = await sb
    .from("wine_images")
    .select("wine_id")
    .eq("id", id)
    .single();

  const { error } = await sb.from("wine_images").delete().eq("id", id);

  if (error) throw new Error(error.message);

  if (image) {
    revalidatePath(`/admin/wines/${image.wine_id}`);
    revalidatePath(`/product/${image.wine_id}`);
  }
}

export async function reorderWineImages(
  wineId: string,
  imageIds: string[],
): Promise<void> {
  const sb = await supabaseServer();

  // Update sort_order for each image
  const updates = imageIds.map((imageId, index) =>
    sb
      .from("wine_images")
      .update({ sort_order: index })
      .eq("id", imageId)
      .eq("wine_id", wineId),
  );

  await Promise.all(updates);

  revalidatePath(`/admin/wines/${wineId}`);
  revalidatePath(`/product/${wineId}`);
}

export async function setPrimaryWineImage(imageId: string): Promise<void> {
  const sb = await supabaseServer();

  // Get the wine_id and current image info
  const { data: image } = await sb
    .from("wine_images")
    .select("wine_id")
    .eq("id", imageId)
    .single();

  if (!image) throw new Error("Image not found");

  // Unset all primary images for this wine
  await sb
    .from("wine_images")
    .update({ is_primary: false })
    .eq("wine_id", image.wine_id);

  // Set this image as primary
  const { error } = await sb
    .from("wine_images")
    .update({ is_primary: true })
    .eq("id", imageId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/wines/${image.wine_id}`);
  revalidatePath(`/product/${image.wine_id}`);
}
