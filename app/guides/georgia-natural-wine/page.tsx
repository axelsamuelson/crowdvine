import type { Metadata } from "next";

import {
  buildGeorgiaNaturalWineGuideMetadata,
  renderGeorgiaNaturalWineGuidePage,
} from "@/lib/guides/render-georgia-natural-wine-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildGeorgiaNaturalWineGuideMetadata();
}

export default function GeorgiaNaturalWineGuidePage() {
  return renderGeorgiaNaturalWineGuidePage();
}
