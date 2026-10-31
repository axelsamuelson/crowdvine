import type { Metadata } from "next";

import {
  buildHomeMetadata,
  renderHomePage,
} from "@/lib/home/render-home-page";

export const dynamic = "force-static";
export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildHomeMetadata("en");
}

/** English homepage — dedicated URL, no auto-redirect from/to `/`. */
export default function EnglishHome() {
  return renderHomePage("en");
}
