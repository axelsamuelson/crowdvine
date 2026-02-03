"use client";

import { useEffect } from "react";
import { MobileMenu } from "./mobile-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoSvg } from "./logo-svg";
import CartModal from "@/components/cart/modal";
import { ProfileIcon } from "./profile-icon";
import { PalletIcon } from "./pallet-icon";
import { PortalToggle } from "./portal-toggle";
import { NavItem } from "@/lib/types";
import { Collection } from "@/lib/shopify/types";
import { CompleteOrderRail } from "@/components/cart/complete-order-rail";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { usePortalAccess } from "@/lib/hooks/use-portal-access";

export const navItems: NavItem[] = [
  {
    label: "home",
    href: "/",
  },
  {
    label: "shop all",
    href: "/shop",
  },
];

interface HeaderProps {
  collections: Collection[];
}

export function Header({ collections }: HeaderProps) {
  const pathname = usePathname();
  const { role } = useUserRole();
  const { showPortalToggle, isB2BOnly, loading } = usePortalAccess();

  // B2B-only users: redirect from pactwines.com to dirtywine.se
  useEffect(() => {
    if (loading || !isB2BOnly || typeof window === "undefined") return;
    const host = window.location.hostname.toLowerCase();
    if (host.includes("pactwines.com")) {
      const target = `https://dirtywine.se${pathname ?? window.location.pathname}${window.location.search}`;
      window.location.href = target;
    }
  }, [loading, isB2BOnly, pathname]);

  return (
    <header className="grid fixed top-0 left-0 z-50 grid-cols-3 items-start w-full p-sides md:grid-cols-12 md:gap-sides">
      <div className="block flex-none md:hidden">
        <MobileMenu collections={collections} />
      </div>
      <Link
        href="/"
        className="md:col-span-3 xl:col-span-2 flex justify-center md:justify-start"
        prefetch
      >
        <LogoSvg className="h-8 md:h-12 w-auto" />
      </Link>
      <nav className="flex gap-2 justify-end items-center md:col-span-9 xl:col-span-10">
        <div className="items-center gap-5 py-0.5 pr-3 bg-transparent hidden md:flex min-w-0">
          {/* Complete order rail should stretch to the left edge of the content column */}
          <CompleteOrderRail />
          <ul className="flex items-center gap-5 pl-3 shrink-0">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "font-semibold text-base transition-colors duration-200 uppercase",
                    pathname === item.href
                      ? "text-foreground"
                      : "text-foreground/50",
                  )}
                  prefetch
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {role === "producer" && (
              <li>
                <Link
                  href="/producer"
                  className={cn(
                    "font-semibold text-base transition-colors duration-200 uppercase",
                    pathname?.startsWith("/producer")
                      ? "text-foreground"
                      : "text-foreground/50",
                  )}
                  prefetch
                >
                  producer
                </Link>
              </li>
            )}
          </ul>
          {showPortalToggle && (
            <PortalToggle showPortalToggle={true} className="shrink-0 ml-2" />
          )}
        </div>
        <PalletIcon />
        <ProfileIcon className="hidden md:block" />
        <CartModal />
      </nav>
    </header>
  );
}
