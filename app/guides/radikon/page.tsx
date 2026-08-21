import type { Metadata } from "next";

import {
  buildRadikonGuideMetadata,
  renderRadikonGuidePage,
} from "@/lib/guides/render-radikon-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildRadikonGuideMetadata();
}

export default function RadikonGuidePage() {
  return renderRadikonGuidePage();
}
