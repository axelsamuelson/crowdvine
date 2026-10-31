import type { Metadata } from "next";

import {
  buildHomeMetadata,
  renderHomePage,
} from "@/lib/home/render-home-page";

// ISR: regenerate homepage HTML periodically (shopping prefs hydrate client-side).
// force-static keeps the route out of the dynamic ƒ bucket when shared layout/data
// helpers would otherwise opt into headers/cookies (CDN needs this for HIT).
export const dynamic = "force-static";
export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildHomeMetadata("sv");
}

/** Swedish homepage — always SV content/meta regardless of cookie/Accept-Language. */
export default function Home() {
  return renderHomePage("sv");
}
