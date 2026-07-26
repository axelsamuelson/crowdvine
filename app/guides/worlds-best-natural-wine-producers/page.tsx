import type { Metadata } from "next";

import {
  buildProducersGuideMetadata,
  renderProducersGuidePage,
} from "@/lib/guides/render-producers-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildProducersGuideMetadata("en");
}

export default function TopProducersGuidePageEn() {
  return renderProducersGuidePage("en");
}
