import { ShopLinks } from "./shop-links";
import { SidebarLinks } from "./sidebar/product-sidebar-links";
import { FooterLogoSvg } from "./footer-logo-svg";

export function Footer() {
  // Temporarily disable collections fetching to prevent blocking
  const collections = [];

  return (
    <footer className="p-sides">
      <div className="w-full md:h-[532px] p-sides md:p-11 text-background bg-foreground rounded-[12px] flex flex-col justify-between max-md:gap-8">
        <div className="flex flex-col justify-between md:flex-row">
          <FooterLogoSvg />
          <ShopLinks
            collections={collections}
            className="max-md:hidden"
            align="right"
          />
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
          <p className="text-base">
            {new Date().getFullYear()}© — All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
