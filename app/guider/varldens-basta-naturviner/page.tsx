import type { Metadata } from "next";

import {
  buildWinesGuideMetadata,
  renderWinesGuidePage,
} from "@/lib/guides/render-wines-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildWinesGuideMetadata("sv");
}

/** Same renderer + BEGINNER_PICKS as /guides/worlds-best-natural-wines. */
export default function TopWinesGuidePage() {
  return renderWinesGuidePage("sv");
}
