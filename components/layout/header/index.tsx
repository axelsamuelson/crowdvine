"use client";

import { useEffect } from "react";
import { MobileMenu } from "./mobile-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoSvg } from "./logo-svg";
import CartModal from "@/components/cart/modal";
import { ProfileIcon } from "./profile-icon";
import { PortalToggle } from "./portal-toggle";
import { NavItem } from "@/lib/types";
import { Collection } from "@/lib/shopify/types";
import { CompleteOrderRail } from "@/components/cart/complete-order-rail";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { usePortalAccess } from "@/lib/hooks/use-portal-access";
import { useAdminStatus } from "@/lib/hooks/use-admin-status";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { SiteLogos } from "@/lib/context/site-logo-provider";

interface HeaderProps {
  collections: Collection[];
  isDirtywineSite: boolean;
  initialLogos?: SiteLogos;
}

export function Header({
  collections,
  isDirtywineSite,
  initialLogos,
}: HeaderProps) {
  const { t } = useTranslations();
  const pathname = usePathname();
  const navItems: NavItem[] = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.shopAll"), href: "/shop" },
  ];
  const { role } = useUserRole();
  const { showPortalToggle, isB2BOnly, loading } = usePortalAccess();
  const { isAdmin } = useAdminStatus();
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
        <MobileMenu
          collections={collections}
          isDirtywineSite={isDirtywineSite}
        />
      </div>
      <Link
        href="/"
        className="md:col-span-3 xl:col-span-2 flex justify-center md:justify-start"
        prefetch
      >
        <LogoSvg className="h-8 md:h-12 w-auto" initialLogos={initialLogos} />
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
                    (item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname?.startsWith(item.href + "/"))
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
                  {t("nav.producer")}
                </Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link
                  href="/admin"
                  className={cn(
                    "font-semibold text-base transition-colors duration-200 uppercase",
                    pathname?.startsWith("/admin")
                      ? "text-foreground"
                      : "text-foreground/50",
                  )}
                  prefetch
                >
                  {t("nav.admin")}
                </Link>
              </li>
            )}
          </ul>
          {showPortalToggle && (
            <PortalToggle showPortalToggle={true} className="shrink-0 ml-2" />
          )}
        </div>
        <ProfileIcon className="hidden md:block" />
        <CartModal />
      </nav>
    </header>
  );
}
