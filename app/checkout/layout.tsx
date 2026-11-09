import type { Metadata } from "next";

import { privatePageMetadata } from "@/lib/seo/private-page-metadata";
import { CheckoutOverlayGuard } from "./checkout-overlay-guard";

export const metadata: Metadata = privatePageMetadata;

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CheckoutOverlayGuard />
      {children}
    </>
  );
}
