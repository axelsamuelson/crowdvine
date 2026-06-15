import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { NOINDEX_PAGE_ROBOTS } from "@/lib/seo/noindex-robots";
import "../../../i/[code]/invite-opus.css";
import { EnsureScroll } from "./ensure-scroll";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

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
    <div className={instrumentSerif.variable}>
      <EnsureScroll />
      {children}
    </div>
  );
}
