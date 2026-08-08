import { getSiteContentByKey, updateSiteContent } from "@/lib/actions/content";

export const MENU_PIPELINE_PAUSED_KEY = "menu_pipeline_paused";

/** True when automated menu pipeline (cron + alerts) should not run. */
export async function isMenuPipelinePaused(): Promise<boolean> {
  try {
    const value = await getSiteContentByKey(MENU_PIPELINE_PAUSED_KEY);
    return value?.trim() === "true";
  } catch (err) {
    console.warn(
      "[menu-pipeline] Failed to read pause flag; treating as live:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

export async function setMenuPipelinePaused(paused: boolean): Promise<void> {
  await updateSiteContent(MENU_PIPELINE_PAUSED_KEY, paused ? "true" : "false");
}
