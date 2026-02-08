"use server";

import { getSiteContentByKey, updateSiteContent } from "@/lib/actions/content";
import { revalidatePath } from "next/cache";

const FEW_LEFT_KEY = "wine_few_left_threshold";
const DEFAULT_FEW_LEFT = 5;

export async function getWineFewLeftThreshold(): Promise<number> {
  const val = await getSiteContentByKey(FEW_LEFT_KEY);
  if (val == null || val === "") return DEFAULT_FEW_LEFT;
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FEW_LEFT;
}

export async function updateWineFewLeftThreshold(value: number): Promise<void> {
  const clamped = Math.max(0, Math.min(999, Math.round(value)));
  await updateSiteContent(FEW_LEFT_KEY, String(clamped));
  revalidatePath("/admin/wines/settings");
  revalidatePath("/admin/wines");
}
