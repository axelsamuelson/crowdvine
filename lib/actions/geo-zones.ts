"use server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { deletePalletZone } from "@/lib/actions/zones";
import { revalidatePath } from "next/cache";

export type DeleteGeoZoneResult = {
  deliveryDeleted: boolean;
  deliveryWarning?: string;
};

/** Deletes a shopper geo zone and attempts to remove its linked delivery pallet zone. */
export async function deleteGeoZone(id: string): Promise<DeleteGeoZoneResult> {
  const sb = getSupabaseAdmin();
  const { data: row, error: fetchErr } = await sb
    .from("geo_zones")
    .select("id, display_name, default_delivery_zone_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Vinzonen hittades inte.");

  const deliveryId = row.default_delivery_zone_id as string | null;

  const { error: delErr } = await sb.from("geo_zones").delete().eq("id", id);
  if (delErr) throw new Error(delErr.message);

  revalidatePath("/admin/geo-zones");
  revalidatePath(`/admin/geo-zones/${id}`);

  if (!deliveryId) {
    return { deliveryDeleted: false };
  }

  try {
    await deletePalletZone(deliveryId);
    revalidatePath("/admin/zones");
    return { deliveryDeleted: true };
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "Kopplad leveranszon kunde inte raderas.";
    return { deliveryDeleted: false, deliveryWarning: msg };
  }
}
