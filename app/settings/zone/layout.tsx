import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Wine zone",
};

export default function WineZoneSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
