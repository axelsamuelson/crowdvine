import type { Metadata } from "next";

import {
  buildGuyBretonGuideMetadata,
  renderGuyBretonGuidePage,
} from "@/lib/guides/render-guy-breton-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildGuyBretonGuideMetadata();
}

export default function GuyBretonGuidePage() {
  return renderGuyBretonGuidePage();
}
