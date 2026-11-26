"use client";

import dynamic from "next/dynamic";
import type { HeaderProducerLink } from "@/lib/shop/shop-producer-link";

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
  popularCollections,
  isDirtywineSite,
}: {
  popularCollections: HeaderProducerLink[];
  isDirtywineSite: boolean;
}) {
  return (
    <MobileMenu
      popularCollections={popularCollections}
      isDirtywineSite={isDirtywineSite}
    />
  );
}
