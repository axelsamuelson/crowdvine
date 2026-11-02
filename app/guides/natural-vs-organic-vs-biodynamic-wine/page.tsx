import type { Metadata } from "next";

import {
  buildNaturalVsOrganicMetadata,
  renderNaturalVsOrganicGuidePage,
} from "@/lib/guides/render-natural-vs-organic-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildNaturalVsOrganicMetadata();
}

export default function NaturalVsOrganicVsBiodynamicWineGuidePage() {
  return renderNaturalVsOrganicGuidePage();
}
