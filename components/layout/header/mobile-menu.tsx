"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { ShopLinks } from "@/components/layout/shop-links";
import { SidebarLinks } from "@/components/layout/sidebar/product-sidebar-links";
import { useMobileMenu } from "@/components/layout/header/mobile-menu-context";
import { Factory } from "lucide-react";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { usePortalAccess } from "@/lib/hooks/use-portal-access";
import { useAdminStatus } from "@/lib/hooks/use-admin-status";
import { PortalToggle } from "./portal-toggle";
import { Shield } from "lucide-react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { cn } from "@/lib/utils";

/** PACT mobile nav row — desktop header uppercase nav + Inès tokens. */
const PACT_NAV_ROW =
  "flex h-14 w-full items-center border-t border-[rgba(10,10,10,0.10)] text-[15px] font-medium uppercase tracking-[0.02em] text-[#0A0A0A] active:bg-[rgba(10,10,10,0.04)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/70 focus-visible:ring-offset-4 focus-visible:ring-offset-foreground/20";

const PACT_NAV_CURRENT = "underline decoration-1 underline-offset-4";

const PACT_NAV_SECONDARY =
  "flex h-14 w-full items-center border-t border-[rgba(10,10,10,0.10)] text-[15px] font-medium uppercase tracking-[0.02em] text-[#737373] active:bg-[rgba(10,10,10,0.04)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/70 focus-visible:ring-offset-4 focus-visible:ring-offset-foreground/20";

function isNavCurrent(pathname: string | null, href: string, homeHref: string) {
  if (!pathname) return false;
  if (href === homeHref) return pathname === homeHref;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileMenu({
  collections,
  popularCollections,
  isDirtywineSite,
}: {
  collections: any[];
  popularCollections: any[];
  isDirtywineSite: boolean;
}) {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const { isOpen, openMobileMenu, closeMobileMenu } = useMobileMenu();
  // Dirty Wine: omit Profil / Om oss / Guider (PACT-only; guides 301 → CORS).
  // PACT order (Inès): Hem, Butik, Guider, Om oss, Profil.
  const navItems = isDirtywineSite
    ? [
        { href: paths.shop, label: t("common.shop") },
        { href: paths.home, label: t("common.home") },
      ]
    : [
        { href: paths.home, label: t("common.home") },
        // Same label as desktop header (Alla viner / All wines); footer keeps common.shop.
        { href: paths.shop, label: t("nav.shopAll") },
        { href: paths.guides, label: t("common.guides") },
        { href: paths.about, label: t("common.about") },
        { href: "/profile", label: t("common.profile") },
      ];
  const pathname = usePathname();
  const { role } = useUserRole();
  const { showPortalToggle } = usePortalAccess();
  const { isAdmin } = useAdminStatus();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        closeMobileMenu();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  return (
    <>
      <Button
        onClick={openMobileMenu}
        aria-label={t("common.openMenu")}
        variant="secondary"
        size="sm"
        // Match cart trigger corner radius on mobile (rounded-sm, not pill).
        // Dirtywine: sentence case "Meny"; PACT keeps uppercase "MENU".
        className={
          isDirtywineSite
            ? "rounded-sm normal-case md:hidden"
            : "rounded-sm uppercase md:hidden"
        }
      >
        {t("common.menu")}
      </Button>

      {isClient && (
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed inset-0 z-[60] bg-foreground/30"
                onClick={closeMobileMenu}
                aria-hidden="true"
              />

              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed bottom-0 left-0 top-0 z-[60] flex w-full p-modal-sides md:w-[400px]"
              >
                <div className="flex w-full flex-col overflow-hidden rounded bg-muted p-3 md:p-4">
                  <div className="mb-10 flex items-center justify-between pl-2">
                    <p className="text-2xl font-semibold text-foreground">
                      {t("common.menu")}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      data-testid="mobile-menu-close"
                      aria-label={t("common.closeMenu")}
                      onClick={closeMobileMenu}
                      // 56×44 hit area; Geist 500 / 15px / #0A0A0A
                      className="h-11 min-h-11 min-w-[56px] px-3 text-[15px] font-medium text-[#0A0A0A] hover:bg-transparent hover:text-[#0A0A0A]"
                    >
                      {t("common.close")}
                    </Button>
                  </div>

                  {showPortalToggle && (
                    <div className="mb-4 pl-2">
                      <PortalToggle showPortalToggle={true} />
                    </div>
                  )}

                  <div className="mx-[-0.75rem] flex-1 overflow-y-auto px-3 md:mx-[-1rem] md:px-4">
                    {isDirtywineSite ? (
                      // Dirty Wine: keep pill grid unchanged.
                      <nav className="mb-10 grid grid-cols-2 gap-x-6 gap-y-4">
                        {role === "producer" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={closeMobileMenu}
                            className="justify-start uppercase bg-background/50"
                            asChild
                          >
                            <Link href="/producer" prefetch>
                              <Factory className="mr-2 h-4 w-4" />
                              {t("nav.producer")}
                            </Link>
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={closeMobileMenu}
                            className="justify-start uppercase bg-background/50"
                            asChild
                          >
                            <Link href="/admin" prefetch>
                              <Shield className="mr-2 h-4 w-4" />
                              {t("nav.admin")}
                            </Link>
                          </Button>
                        )}
                        {navItems.map((item) => (
                          <Button
                            key={item.href}
                            size="sm"
                            variant="secondary"
                            onClick={closeMobileMenu}
                            className="justify-start uppercase bg-background/50"
                            asChild
                          >
                            <Link href={item.href} prefetch>
                              {item.label}
                            </Link>
                          </Button>
                        ))}
                      </nav>
                    ) : (
                      // PACT: desktop header nav casing (uppercase) + Inès row tokens.
                      // Desktop match: components/layout/header/index.tsx (~115–128).
                      <nav
                        className="mb-0 flex flex-col"
                        data-testid="mobile-menu-nav-pact"
                      >
                        {navItems.map((item) => {
                          const current = isNavCurrent(
                            pathname,
                            item.href,
                            paths.home,
                          );
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              prefetch
                              onClick={closeMobileMenu}
                              aria-current={current ? "page" : undefined}
                              className={cn(
                                PACT_NAV_ROW,
                                current && PACT_NAV_CURRENT,
                              )}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                        {(isAdmin || role === "producer") && (
                          <div
                            // Bottom rule closes the admin/producer block (same 1px as row borders);
                            // ShopLinks parent mt-10 keeps 40px to Populära (matches logged-out).
                            className="mt-6 flex flex-col border-b border-[rgba(10,10,10,0.10)]"
                            data-testid="mobile-menu-nav-admin"
                          >
                            {isAdmin ? (
                              <Link
                                href="/admin"
                                prefetch
                                onClick={closeMobileMenu}
                                className={PACT_NAV_SECONDARY}
                              >
                                {t("nav.admin")}
                              </Link>
                            ) : null}
                            {role === "producer" ? (
                              <Link
                                href="/producer"
                                prefetch
                                onClick={closeMobileMenu}
                                className={PACT_NAV_SECONDARY}
                              >
                                {t("nav.producer")}
                              </Link>
                            ) : null}
                          </div>
                        )}
                      </nav>
                    )}

                    <div className={cn(isDirtywineSite ? "mb-10" : "mb-10 mt-10")}>
                      <ShopLinks
                        label={t("home.popularProducers")}
                        locale={paths.locale}
                        limit={10}
                        collections={popularCollections}
                        onLinkClick={closeMobileMenu}
                        {...(!isDirtywineSite
                          ? {
                              // 40px above label via parent mt-10; label/names per Inès.
                              labelClassName:
                                "text-[13px] font-medium uppercase tracking-[0.04em] text-[#737373] md:text-[13px]",
                              listClassName: "mt-0 flex flex-col gap-0",
                              linkClassName:
                                "flex h-10 items-center text-[17px] font-normal text-[#0A0A0A] no-underline hover:no-underline",
                            }
                          : {})}
                      />
                    </div>
                  </div>

                  <div className="mt-auto border-t border-gray-200/50 pt-6">
                    <div className="mb-4">
                      <p
                        className={cn(
                          isDirtywineSite
                            ? "text-sm italic leading-tight opacity-50"
                            : "text-[14px] font-normal leading-tight text-[#737373]",
                        )}
                      >
                        {t("home.tagline")}
                      </p>
                    </div>
                    <SidebarLinks className="w-full gap-2" />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
