import type { ReactNode } from "react";
import { Instrument_Serif } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export default function NaturalVsOrganicGuideLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={instrumentSerif.variable}>{children}</div>;
}
