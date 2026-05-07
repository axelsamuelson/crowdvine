import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hitta vin",
  description:
    "Sök bland vinlistorna på Stockholms bästa vinkrogar. Hitta var ditt favoritvin finns och vad det kostar.",
};

export default function WineSearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
