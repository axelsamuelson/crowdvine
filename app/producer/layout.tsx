import type { Metadata } from "next";

import { NOINDEX_PAGE_ROBOTS } from "@/lib/seo/noindex-robots";

/** Producer portal (/producer, /producer/settings, …) — not for search indexes. */
export const metadata: Metadata = {
  robots: NOINDEX_PAGE_ROBOTS,
};

export default function ProducerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
