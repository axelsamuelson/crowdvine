import type { Metadata } from "next";

import {
  buildThierryAllemandGuideMetadata,
  renderThierryAllemandGuidePage,
} from "@/lib/guides/render-thierry-allemand-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildThierryAllemandGuideMetadata();
}

export default function ThierryAllemandGuidePage() {
  return renderThierryAllemandGuidePage();
}
