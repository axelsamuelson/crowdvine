import type { Metadata } from "next";
import type { ReactNode } from "react";

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

/** Route permanently redirects home; layout kept only for noindex metadata. */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}
