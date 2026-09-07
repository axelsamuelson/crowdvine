import type { Metadata } from "next";

import {
  buildGuideHubMetadata,
  renderGuideHubPage,
} from "@/lib/guides/render-guide-hub";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildGuideHubMetadata("en");
}

export default function GuidesHubPage() {
  return renderGuideHubPage("en");
}
