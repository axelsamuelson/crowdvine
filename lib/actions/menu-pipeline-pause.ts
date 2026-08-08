"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  isMenuPipelinePaused,
  setMenuPipelinePaused,
} from "@/lib/menu-extraction/pipeline-pause";

export async function getMenuPipelinePausedAction(): Promise<boolean> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Unauthorized");
  return isMenuPipelinePaused();
}

export async function setMenuPipelinePausedAction(
  paused: boolean,
): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Unauthorized");
  await setMenuPipelinePaused(paused);
  revalidatePath("/admin/menu-extraction");
}
