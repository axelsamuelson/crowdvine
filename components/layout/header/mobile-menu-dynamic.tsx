"use client";

import dynamic from "next/dynamic";
import type { Collection } from "@/lib/shopify/types";

const MobileMenu = dynamic(
  () =>
    import("@/components/layout/header/mobile-menu").then((m) => m.MobileMenu),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-10 w-10 items-center justify-center" aria-hidden />
    ),
  },
);

export function MobileMenuDynamic({
  collections,
  popularCollections,
  isDirtywineSite,
}: {
  collections: Collection[];
  popularCollections: Collection[];
  isDirtywineSite: boolean;
}) {
  return (
    <MobileMenu
      collections={collections}
      popularCollections={popularCollections}
      isDirtywineSite={isDirtywineSite}
    />
  );
}
