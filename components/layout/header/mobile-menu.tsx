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
  // PACT order (Inès): Hem, Butik, Guider, Om oss, Profil — sentence case via messages.
  const navItems = isDirtywineSite
    ? [
        { href: paths.shop, label: t("common.shop") },
        { href: paths.home, label: t("common.home") },
      ]
    : [
        { href: paths.home, label: t("common.home") },
        { href: paths.shop, label: t("common.shop") },
        { href: paths.guides, label: t("common.guides") },
        { href: paths.about, label: t("common.about") },
        { href: "/profile", label: t("common.profile") },
      ];
  const pathname = usePathname();
  const { role } = useUserRole();
  const { showPortalToggle } = usePortalAccess();
  const { isAdmin } = useAdminStatus();
  const [isClient, setIsClient] = useState(false);

  // Ensure animations only run on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Close menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        closeMobileMenu();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  // Close menu when route changes
  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  const roleLinks = (
    <>
      {role === "producer" && (
        isDirtywineSite ? (
          <Button
            key="/producer"
            size="sm"
            variant="secondary"
            onClick={closeMobileMenu}
            className="justify-start uppercase bg-background/50"
            asChild
          >
            <Link href="/producer" prefetch>
              <Factory className="w-4 h-4 mr-2" />
              {t("nav.producer")}
            </Link>
          </Button>
        ) : (
          <Link
            key="/producer"
            href="/producer"
            prefetch
            onClick={closeMobileMenu}
            className="flex w-full items-center border-b border-border py-3 text-sm text-foreground transition-colors hover:underline"
          >
            {t("nav.producer")}
          </Link>
        )
      )}
      {isAdmin && (
        isDirtywineSite ? (
          <Button
            key="/admin"
            size="sm"
            variant="secondary"
            onClick={closeMobileMenu}
            className="justify-start uppercase bg-background/50"
            asChild
          >
            <Link href="/admin" prefetch>
              <Shield className="w-4 h-4 mr-2" />
              {t("nav.admin")}
            </Link>
          </Button>
        ) : (
          <Link
            key="/admin"
            href="/admin"
            prefetch
            onClick={closeMobileMenu}
            className="flex w-full items-center border-b border-border py-3 text-sm text-foreground transition-colors hover:underline"
          >
            {t("nav.admin")}
          </Link>
        )
      )}
    </>
  );

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

      {/* Don't render motion components during SSR */}
      {isClient && (
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop — above header cart so «Stäng»/Close stays tappable */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed inset-0 z-[60] bg-foreground/30"
                onClick={closeMobileMenu}
                aria-hidden="true"
              />

              {/* Panel */}
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
                      // ≥44×44 hit target; full-contrast like the Meny heading.
                      className="h-11 min-h-11 min-w-11 px-3 text-foreground hover:text-foreground"
                    >
                      {t("common.close")}
                    </Button>
                  </div>

                  {showPortalToggle && (
                    <div className="mb-4 pl-2">
                      <PortalToggle showPortalToggle={true} />
                    </div>
                  )}

                  {/* Scrollable content area */}
                  <div className="mx-[-0.75rem] flex-1 overflow-y-auto px-3 md:mx-[-1rem] md:px-4">
                    {isDirtywineSite ? (
                      // Dirty Wine: keep pill grid unchanged.
                      <nav className="mb-10 grid grid-cols-2 gap-x-6 gap-y-4">
                        {roleLinks}
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
                      // PACT: footer Navigation list style — vertical text-sm rows + thin dividers.
                      // Matched from components/layout/footer.tsx (Navigation links).
                      <nav
                        className="mb-10 flex flex-col"
                        data-testid="mobile-menu-nav-pact"
                      >
                        {roleLinks}
                        {navItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch
                            onClick={closeMobileMenu}
                            className="flex w-full items-center border-b border-border py-3 text-sm text-foreground transition-colors hover:underline last:border-b-0"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </nav>
                    )}

                    <div className="mb-10">
                      <ShopLinks
                        label={t("home.popularProducers")}
                        locale={paths.locale}
                        limit={10}
                        emptyMessage={t("home.noProducersFound", {
                          count: collections?.length ?? 0,
                        })}
                        collections={popularCollections}
                        onLinkClick={closeMobileMenu}
                      />
                    </div>
                  </div>

                  {/* Footer - always visible at bottom */}
                  <div className="mt-auto border-t border-gray-200/50 pt-6">
                    <div className="mb-4 text-sm leading-tight opacity-50">
                      <p className={cn(isDirtywineSite && "italic")}>
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
