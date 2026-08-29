import type { Metadata } from "next";

import {
  buildWorldsBestOrangeWinesMetadata,
  renderWorldsBestOrangeWinesPage,
} from "@/lib/guides/render-worlds-best-orange-wines";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildWorldsBestOrangeWinesMetadata("sv");
}

export default function WorldsBestOrangeWinesPageSv() {
  return renderWorldsBestOrangeWinesPage("sv");
}
