import type { Metadata } from "next";

import {
  buildJuraNaturalWineGuideMetadata,
  renderJuraNaturalWineGuidePage,
} from "@/lib/guides/render-jura-natural-wine-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildJuraNaturalWineGuideMetadata();
}

export default function JuraNaturalWineGuidePage() {
  return renderJuraNaturalWineGuidePage();
}
