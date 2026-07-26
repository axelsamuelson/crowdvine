import type { Metadata } from "next";

import {
  buildGuideHubMetadata,
  renderGuideHubPage,
} from "@/lib/guides/render-guide-hub";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildGuideHubMetadata("sv");
}

export default function GuiderHubPage() {
  return renderGuideHubPage("sv");
}
