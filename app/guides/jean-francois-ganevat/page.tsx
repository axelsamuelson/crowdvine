import type { Metadata } from "next";

import {
  buildJeanFrancoisGanevatGuideMetadata,
  renderJeanFrancoisGanevatGuidePage,
} from "@/lib/guides/render-jean-francois-ganevat-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildJeanFrancoisGanevatGuideMetadata();
}

export default function JeanFrancoisGanevatGuidePage() {
  return renderJeanFrancoisGanevatGuidePage();
}
