import type { Metadata } from "next";

import {
  buildJeanPaulThevenetGuideMetadata,
  renderJeanPaulThevenetGuidePage,
} from "@/lib/guides/render-jean-paul-thevenet-guide";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildJeanPaulThevenetGuideMetadata();
}

export default function JeanPaulThevenetGuidePage() {
  return renderJeanPaulThevenetGuidePage();
}
