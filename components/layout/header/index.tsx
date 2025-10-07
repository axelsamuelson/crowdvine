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

  return (
    <header className="grid fixed top-0 left-0 z-50 grid-cols-4 items-start w-full px-4 md:grid-cols-12 md:gap-sides md:p-sides">
      <div className="block flex-none md:hidden">
        <MobileMenu collections={collections} />
      </div>
      <Link
        href="/"
        className="col-span-2 md:col-span-3 xl:col-span-2 flex justify-center md:justify-start"
        prefetch
      >
        <LogoSvg className="h-6 md:h-12 w-auto" />
      </Link>
      <nav className="flex gap-1 justify-end items-center md:col-span-9 xl:col-span-10 md:gap-2">
        <ul className="items-center gap-5 py-0.5 px-3 bg-background/10 rounded-sm backdrop-blur-md hidden md:flex">
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
        </ul>
        <PalletIcon />
        <ProfileIcon />
        <CartModal />
      </nav>
    </header>
  );
}
