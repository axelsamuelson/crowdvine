import type { Metadata } from "next";
import { NOINDEX_PAGE_ROBOTS } from "@/lib/seo/noindex-robots";

export const metadata: Metadata = {
  robots: NOINDEX_PAGE_ROBOTS,
  title: "Pallet details",
};

export default function PalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
