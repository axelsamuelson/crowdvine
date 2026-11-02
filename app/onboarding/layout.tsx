import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./opus.css";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="opus-theme">{children}</div>;
}
