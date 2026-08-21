import type { Metadata } from "next";

import {
  buildWorldsBestNaturalChampagneMetadata,
  renderWorldsBestNaturalChampagnePage,
} from "@/lib/guides/render-worlds-best-natural-champagne";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildWorldsBestNaturalChampagneMetadata();
}

export default function WorldsBestNaturalChampagnePage() {
  return renderWorldsBestNaturalChampagnePage();
}
