"use client";

import { useEffect } from "react";
import { MobileMenuDynamic } from "./mobile-menu-dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoSvg } from "./logo-svg";
import { CartModalDynamic } from "./cart-modal-dynamic";
import { ProfileIcon } from "./profile-icon";
import { PortalToggle } from "./portal-toggle";
import { NavItem } from "@/lib/types";
import { Collection } from "@/lib/shopify/types";
import { CompleteOrderRailDynamic } from "./complete-order-rail-dynamic";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { usePortalAccess } from "@/lib/hooks/use-portal-access";
import { useAdminStatus } from "@/lib/hooks/use-admin-status";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import type { SiteLogos } from "@/lib/context/site-logo-provider";

interface HeaderProps {
  collections: Collection[];
  popularCollections: Collection[];
  isDirtywineSite: boolean;
  initialLogos?: SiteLogos;
}

export function Header({
  collections,
  popularCollections,
  isDirtywineSite,
  initialLogos,
}: HeaderProps) {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const pathname = usePathname();
  const navItems: NavItem[] = [
    { label: t("nav.home"), href: paths.home },
    { label: t("nav.shopAll"), href: paths.shop },
    { label: t("nav.guides"), href: paths.guides },
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
        <MobileMenuDynamic
          collections={collections}
          popularCollections={popularCollections}
          isDirtywineSite={isDirtywineSite}
        />
      </div>
      <Link
        href={paths.home}
        className="md:col-span-3 xl:col-span-2 flex justify-center md:justify-start"
        prefetch
      >
        <LogoSvg className="h-8 md:h-12 w-auto" initialLogos={initialLogos} />
      </Link>
      <nav className="flex gap-2 justify-end items-center md:col-span-9 xl:col-span-10">
        <div className="items-center gap-5 py-0.5 pr-3 bg-transparent hidden md:flex min-w-0">
          {/* Complete order rail should stretch to the left edge of the content column */}
          <CompleteOrderRailDynamic />
          <ul className="flex items-center gap-5 pl-3 shrink-0">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "font-semibold text-base transition-colors duration-200 uppercase",
                    (item.href === paths.home
                      ? pathname === paths.home
                      : pathname === item.href ||
                        pathname?.startsWith(item.href + "/"))
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
                    pathname === "/producer" ||
                      pathname?.startsWith("/producer/")
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
        <CartModalDynamic />
      </nav>
    </header>
  );
}
