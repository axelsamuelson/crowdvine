import type { Metadata } from "next";

import {
  buildJoskoGravnerGuideMetadata,
  renderJoskoGravnerGuidePage,
} from "@/lib/guides/render-josko-gravner-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildJoskoGravnerGuideMetadata();
}

export default function JoskoGravnerGuidePage() {
  return renderJoskoGravnerGuidePage();
}
