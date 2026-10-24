"use server";

import { requireAdmin } from "@/lib/admin-auth-server";
import {
  deleteGeoZoneRow,
  deletePalletZoneCore,
} from "@/lib/admin/lager-frakt-writes";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export type DeleteGeoZoneResult = {
  deliveryDeleted: boolean;
  deliveryWarning?: string;
};

/** Deletes a shopper geo zone and attempts to remove its linked delivery pallet zone. */
export async function deleteGeoZone(id: string): Promise<DeleteGeoZoneResult> {
  await requireAdmin();
  const sb = getSupabaseAdmin();
  const before = await deleteGeoZoneRow(sb, id);

  if (!before.default_delivery_zone_id) {
    return { deliveryDeleted: false };
  }

  try {
    await deletePalletZoneCore(sb, before.default_delivery_zone_id);
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
