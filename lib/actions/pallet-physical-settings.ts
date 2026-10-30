"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth-server";
import {
  getPalletPhysicalSettings,
  updatePalletPhysicalSettings,
  type PalletPhysicalSettings,
} from "@/lib/pallet-physical-settings";

export async function loadPalletPhysicalSettingsAction(): Promise<PalletPhysicalSettings> {
  await requireAdmin();
  return getPalletPhysicalSettings();
}

export async function savePalletPhysicalSettingsAction(input: {
  pickupSelectionTriggerShare: number;
  weightLimitKg: number | null;
  kgPerBottle: number;
}): Promise<void> {
  await requireAdmin();
  await updatePalletPhysicalSettings({
    pickupSelectionTriggerShare: input.pickupSelectionTriggerShare,
    weightLimitKg: input.weightLimitKg,
    kgPerBottle: input.kgPerBottle,
  });
  revalidatePath("/admin/pallets");
  revalidatePath("/admin/pallets/settings");
}
