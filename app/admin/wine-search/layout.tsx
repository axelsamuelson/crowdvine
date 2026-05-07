import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Hitta vin",
  description: "Sök var viner serveras på restauranger i Stockholm (Starwinelist).",
};

export default function AdminWineSearchLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
