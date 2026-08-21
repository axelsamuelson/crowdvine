import type { Metadata } from "next";

import {
  buildMarcelLapierreGuideMetadata,
  renderMarcelLapierreGuidePage,
} from "@/lib/guides/render-marcel-lapierre-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildMarcelLapierreGuideMetadata();
}

export default function MarcelLapierreGuidePage() {
  return renderMarcelLapierreGuidePage();
}
