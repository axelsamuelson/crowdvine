import type { Metadata } from "next";

import {
  buildGangOfFourWineGuideMetadata,
  renderGangOfFourWineGuidePage,
} from "@/lib/guides/render-gang-of-four-wine-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildGangOfFourWineGuideMetadata();
}

export default function GangOfFourWineGuidePage() {
  return renderGangOfFourWineGuidePage();
}
