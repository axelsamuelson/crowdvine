import type { Metadata } from "next";

import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

/** /profile* and /en/profile* (middleware rewrite) — never index. */
export const metadata: Metadata = privatePageMetadata;

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
