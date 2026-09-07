import type { Metadata } from "next";

import {
  buildWinesGuideMetadata,
  renderWinesGuidePage,
} from "@/lib/guides/render-wines-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildWinesGuideMetadata("en");
}

export default function TopWinesGuidePageEn() {
  return renderWinesGuidePage("en");
}
