"use client";

import { MobileMenu } from "./mobile-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoSvg } from "./logo-svg";
import CartModal from "@/components/cart/modal";
import { ProfileIcon } from "./profile-icon";
import { PalletIcon } from "./pallet-icon";
import { NavItem } from "@/lib/types";
import { Collection } from "@/lib/shopify/types";
import { CompleteOrderRail } from "@/components/cart/complete-order-rail";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { B2BToggle } from "./b2b-toggle";

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

  return (
    <header className="grid fixed top-0 left-0 z-50 grid-cols-3 items-start w-full p-sides md:grid-cols-12 md:gap-sides">
      <div className="block flex-none md:hidden">
        <MobileMenu collections={collections} />
      </div>
      <div className="md:col-span-3 xl:col-span-2 flex items-center gap-3 justify-center md:justify-start">
        <Link href="/" prefetch>
          <LogoSvg className="h-8 md:h-12 w-auto" />
        </Link>
        <B2BToggle />
      </div>
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
        </div>
        <PalletIcon />
        <ProfileIcon className="hidden md:block" />
        <CartModal />
      </nav>
    </header>
  );
}
