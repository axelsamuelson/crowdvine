import type { Metadata } from "next";
import { NOINDEX_PAGE_ROBOTS } from "@/lib/seo/noindex-robots";

export const metadata: Metadata = {
  robots: NOINDEX_PAGE_ROBOTS,
  title: "Wine tasting session",
};

export default function TastingSessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
