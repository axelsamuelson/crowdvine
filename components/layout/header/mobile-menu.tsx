"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { ShopLinks } from "@/components/layout/shop-links";
import { SidebarLinks } from "@/components/layout/sidebar/product-sidebar-links";
import { useMobileMenu } from "@/components/layout/header/mobile-menu-context";
import { User } from "lucide-react";

const navItems = [
  { href: "/shop", label: "Shop" },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/about", label: "About" },
  { href: "/", label: "Home" },
];

export function MobileMenu({ collections }: { collections: any[] }) {
  const { isOpen, openMobileMenu, closeMobileMenu } = useMobileMenu();
  const pathname = usePathname();
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

  return (
    <>
      <Button
        onClick={openMobileMenu}
        aria-label="Open mobile menu"
        variant="secondary"
        size="sm"
        className="uppercase md:hidden"
      >
        Menu
      </Button>

      {/* Don't render motion components during SSR */}
      {isClient && (
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed inset-0 z-50 bg-foreground/30"
                onClick={closeMobileMenu}
                aria-hidden="true"
              />

              {/* Panel */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed top-0 bottom-0 left-0 flex w-full md:w-[400px] p-modal-sides z-50"
              >
                <div className="flex flex-col p-3 w-full rounded bg-muted md:p-4 overflow-hidden">
                  <div className="flex justify-between items-baseline pl-2 mb-10">
                    <p className="text-2xl font-semibold">Menu</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Close cart"
                      onClick={closeMobileMenu}
                    >
                      Close
                    </Button>
                  </div>

                  {/* Scrollable content area */}
                  <div className="flex-1 overflow-y-auto -mx-3 px-3 md:-mx-4 md:px-4">
                    <nav className="grid grid-cols-2 gap-y-4 gap-x-6 mb-10">
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
                            {item.icon && (
                              <item.icon className="w-4 h-4 mr-2" />
                            )}
                            {item.label}
                          </Link>
                        </Button>
                      ))}
                    </nav>

                    <div className="mb-10">
                      <ShopLinks
                        label="Popular Producers"
                        collections={collections}
                        onLinkClick={closeMobileMenu}
                      />
                    </div>
                  </div>

                  {/* Footer - always visible at bottom */}
                  <div className="mt-auto pt-6 border-t border-gray-200/50">
                    <div className="mb-4 text-sm leading-tight opacity-50">
                      <p className="italic">Producers And Consumers Together</p>
                    </div>
                    <SidebarLinks className="gap-2 w-full" />
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
