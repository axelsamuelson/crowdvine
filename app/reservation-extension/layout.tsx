import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

/** Transactional email landing — never index (?lang= must not create duplicates). */
export const metadata: Metadata = privatePageMetadata;

export default function ReservationExtensionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
