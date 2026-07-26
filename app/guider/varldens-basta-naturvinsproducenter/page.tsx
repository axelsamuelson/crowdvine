import type { Metadata } from "next";

import {
  buildProducersGuideMetadata,
  renderProducersGuidePage,
} from "@/lib/guides/render-producers-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildProducersGuideMetadata("sv");
}

export default function TopProducersGuidePage() {
  return renderProducersGuidePage("sv");
}
