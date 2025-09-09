import { ShopLinks } from "./shop-links";
import { SidebarLinks } from "./sidebar/product-sidebar-links";
import { getCollections } from "@/lib/shopify";

export async function Footer() {
  let collections = [];
  try {
    collections = await getCollections();
  } catch (error) {
    console.warn('Failed to fetch collections in footer:', error);
    collections = [];
  }

  return (
    <footer className="p-sides">
      <div className="w-full md:h-[532px] p-sides md:p-11 text-background bg-foreground rounded-[12px] flex flex-col justify-between max-md:gap-8">
        <div className="flex flex-col justify-between md:flex-row">
          {/* Temporarily remove FooterLogoSvg to avoid errors */}
          <div className="md:basis-3/4 max-md:w-full max-w-[1200px] h-auto block">
            <svg
              className="h-12 w-auto"
              viewBox="0 0 200 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <text
                x="100"
                y="35"
                textAnchor="middle"
                fill="currentColor"
                fontSize="16"
                fontWeight="bold"
              >
                CrowdVine
              </text>
            </svg>
          </div>
          <ShopLinks
            collections={collections}
            className="max-md:hidden"
            align="right"
          />
          <span className="mt-3 italic font-semibold md:hidden">
            Refined. Minimal. Never boring.
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
