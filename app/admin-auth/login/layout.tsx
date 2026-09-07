import type { Metadata } from "next";

import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: "Admin login",
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
