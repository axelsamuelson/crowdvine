import type { Metadata } from "next";

import {
  buildPierreOvernoyGuideMetadata,
  renderPierreOvernoyGuidePage,
} from "@/lib/guides/render-pierre-overnoy-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildPierreOvernoyGuideMetadata();
}

export default function PierreOvernoyGuidePage() {
  return renderPierreOvernoyGuidePage();
}
