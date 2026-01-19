import type { ReactNode } from "react";
import { Instrument_Serif } from "next/font/google";
import "./opus.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={instrumentSerif.variable}>
      <div className="opus-theme">{children}</div>
    </div>
  );
}


