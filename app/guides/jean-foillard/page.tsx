import type { Metadata } from "next";

import {
  buildJeanFoillardGuideMetadata,
  renderJeanFoillardGuidePage,
} from "@/lib/guides/render-jean-foillard-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildJeanFoillardGuideMetadata();
}

export default function JeanFoillardGuidePage() {
  return renderJeanFoillardGuidePage();
}
