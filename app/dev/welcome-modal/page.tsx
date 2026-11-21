import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { WelcomeModalPreviewClient } from "./preview-client";

export const metadata: Metadata = {
  title: "Welcome modal review (preview)",
  robots: { index: false, follow: false },
};

/**
 * Design-review / screenshot harness for WelcomeModal (3-step kort-v2).
 * Query: locale=sv|en, step=0-2|stepId=1-3, tier=basic|brons|…, earning=0|1, theme=light|dark, direct=1
 */
export default function WelcomeModalDevPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV === "production"
  ) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <WelcomeModalPreviewClient />
    </Suspense>
  );
}
