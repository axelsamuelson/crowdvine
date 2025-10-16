import { SidebarLinks } from "./sidebar/product-sidebar-links";
import { FooterLogoSvg } from "./footer-logo-svg";
import { OnboardingButton } from "./onboarding-button";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="p-sides">
      <div className="w-full md:h-[532px] p-sides md:p-11 text-background bg-foreground rounded-[12px] flex flex-col justify-between max-md:gap-8">
        <div className="flex flex-col justify-between md:flex-row">
          <FooterLogoSvg />
          <nav className="max-md:hidden">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-background uppercase tracking-wide">
                Navigation
              </h3>
              <div className="flex flex-col gap-2">
                <Link 
                  href="/" 
                  className="text-sm text-background/70 hover:text-background transition-colors hover:underline"
                >
                  Home
                </Link>
                <Link 
                  href="/shop" 
                  className="text-sm text-background/70 hover:text-background transition-colors hover:underline"
                >
                  Shop
                </Link>
                <Link 
                  href="/about" 
                  className="text-sm text-background/70 hover:text-background transition-colors hover:underline"
                >
                  About
                </Link>
                <Link 
                  href="/profile" 
                  className="text-sm text-background/70 hover:text-background transition-colors hover:underline"
                >
                  Profile
                </Link>
              </div>
            </div>
          </nav>
          <span className="mt-3 italic font-semibold md:hidden">
            Producers And Consumers Together
          </span>
        </div>
        <div className="flex justify-between max-md:contents text-muted-foreground">
          <SidebarLinks
            className="max-w-[450px] w-full max-md:flex-col"
            size="base"
            invert
          />
          <div className="flex items-center gap-4 max-md:flex-col max-md:gap-3">
            <OnboardingButton />
            <p className="text-base">
              {new Date().getFullYear()}© — All rights reserved
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
