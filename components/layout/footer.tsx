"use client";

import { SidebarLinks } from "./sidebar/product-sidebar-links";
import { FooterLogoSvg } from "./footer-logo-svg";
import { OnboardingButton } from "./onboarding-button";
import Link from "next/link";
import { useTranslations } from "@/lib/hooks/use-translations";
import { FooterShoppingContext } from "@/components/market/header-shopping-context";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";

const footerLogoClass =
  "h-[5.5rem] w-auto max-w-[360px] text-background sm:h-28 sm:max-w-[440px] md:h-32 md:max-w-[520px]";

export function Footer() {
  const { t } = useTranslations();
  const isDirtywineSite = useB2BModeServerHint();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-background p-sides">
      <div className="w-full md:min-h-[420px] p-sides md:p-11 text-background bg-foreground rounded-[12px] flex flex-col justify-between gap-10 max-md:gap-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-10 lg:gap-16">
            <FooterLogoSvg className={footerLogoClass} />

            <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-start sm:gap-10 lg:gap-14 md:pt-0.5">
              <nav className="min-w-0">
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-background">
                    {t("home.navigation")}
                  </h3>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/"
                      className="text-sm text-background/70 hover:text-background transition-colors hover:underline"
                    >
                      {t("common.home")}
                    </Link>
                    <Link
                      href="/shop"
                      className="text-sm text-background/70 hover:text-background transition-colors hover:underline"
                    >
                      {t("common.shop")}
                    </Link>
                    <Link
                      href="/about"
                      className="text-sm text-background/70 hover:text-background transition-colors hover:underline"
                    >
                      {t("common.about")}
                    </Link>
                    <Link
                      href="/profile"
                      className="text-sm text-background/70 hover:text-background transition-colors hover:underline"
                    >
                      {t("common.profile")}
                    </Link>
                  </div>
                </div>
              </nav>

              {!isDirtywineSite ? (
                <div className="flex shrink-0 items-start sm:ml-auto">
                  <FooterShoppingContext />
                </div>
              ) : null}
            </div>
          </div>

          <span className="italic font-semibold text-background/80 md:hidden">
            {t("home.tagline")}
          </span>
        </div>

        <div className="flex justify-between max-md:flex-col max-md:gap-6 text-muted-foreground">
          <SidebarLinks
            className="max-w-[450px] w-full max-md:flex-col"
            size="base"
            invert
          />
          <div className="flex items-center gap-4 max-md:flex-col max-md:items-start max-md:gap-3">
            <OnboardingButton />
            <p className="text-base text-background/60">
              {t("home.allRightsReserved", { year })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
