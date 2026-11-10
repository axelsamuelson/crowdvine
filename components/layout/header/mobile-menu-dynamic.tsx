"use client";

import dynamic from "next/dynamic";
import type { Collection } from "@/lib/shopify/types";

const MobileMenu = dynamic(
  () =>
    import("@/components/layout/header/mobile-menu").then((m) => m.MobileMenu),
  {
    ssr: false,
    loading: () => (
      <span
        className="inline-flex h-10 min-w-[3.25rem] items-center justify-center rounded-sm bg-muted/40 px-2 text-[10px] font-semibold uppercase tracking-wide text-foreground/40 animate-pulse"
        aria-hidden
        data-testid="mobile-menu-loading"
      >
        MENU
      </span>
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
