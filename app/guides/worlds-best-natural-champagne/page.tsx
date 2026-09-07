import type { Metadata } from "next";

import {
  buildWorldsBestNaturalChampagneMetadata,
  renderWorldsBestNaturalChampagnePage,
} from "@/lib/guides/render-worlds-best-natural-champagne";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildWorldsBestNaturalChampagneMetadata("en");
}

export default function WorldsBestNaturalChampagnePage() {
  return renderWorldsBestNaturalChampagnePage("en");
}
