import type { Metadata } from "next";
import { NOINDEX_PAGE_ROBOTS } from "@/lib/seo/noindex-robots";
import "../../../i/[code]/invite-opus.css";
import { EnsureScroll } from "./ensure-scroll";

export const metadata: Metadata = {
  robots: NOINDEX_PAGE_ROBOTS,
  title: "Provningssammanfattning",
  description: "Sammanfattning av vinprovningen",
};

export default function TastingSummaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <EnsureScroll />
      {children}
    </>
  );
}
