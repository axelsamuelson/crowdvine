import type { Metadata } from "next";

import {
  buildWinesGuideMetadata,
  renderWinesGuidePage,
} from "@/lib/guides/render-wines-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildWinesGuideMetadata("sv");
}

export default function TopWinesGuidePage() {
  return renderWinesGuidePage("sv");
}
