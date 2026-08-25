import type { Metadata } from "next";

import {
  buildJacquesSelosseGuideMetadata,
  renderJacquesSelosseGuidePage,
} from "@/lib/guides/render-jacques-selosse-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildJacquesSelosseGuideMetadata();
}

export default function JacquesSelosseGuidePage() {
  return renderJacquesSelosseGuidePage();
}
