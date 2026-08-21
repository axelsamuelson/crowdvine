import type { Metadata } from "next";

import {
  buildBeaujolaisNaturalWineGuideMetadata,
  renderBeaujolaisNaturalWineGuidePage,
} from "@/lib/guides/render-beaujolais-natural-wine-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildBeaujolaisNaturalWineGuideMetadata();
}

export default function BeaujolaisNaturalWineGuidePage() {
  return renderBeaujolaisNaturalWineGuidePage();
}
