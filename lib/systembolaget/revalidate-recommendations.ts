import { revalidatePath, revalidateTag } from "next/cache";

import {
  SB_RECOMMENDATION_WINES_CACHE_TAG,
  SYSTEMBOLAGET_RELEASES_PATHS,
} from "@/lib/systembolaget/recommendation-wines";

/** Bust the release-calendar cache after publishing a weekly recommendations issue. */
export function revalidateSystembolagetRecommendations(): void {
  try {
    revalidateTag(SB_RECOMMENDATION_WINES_CACHE_TAG, "max");
    revalidatePath(SYSTEMBOLAGET_RELEASES_PATHS.sv);
    revalidatePath(SYSTEMBOLAGET_RELEASES_PATHS.en);
    revalidatePath("/sitemap.xml");
  } catch (err) {
    console.warn(
      "[systembolaget-recommendations] revalidate skipped",
      err instanceof Error ? err.message : err,
    );
  }
}
