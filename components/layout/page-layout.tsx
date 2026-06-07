import type { ReactNode } from "react";
import { Footer } from "./footer";
import { cn } from "@/lib/utils";
import type { SiteLogos } from "@/lib/context/site-logo-provider";

export type PageLayoutProps = {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  initialLogos?: SiteLogos;
};

/** Client-safe page shell. Server routes should prefer {@link PageLayoutServer}. */
export function PageLayout({
  children,
  className,
  noPadding = false,
  initialLogos,
}: PageLayoutProps) {
  return (
    <>
      <div className={cn(!noPadding && "pt-top-spacing", className)}>
        {children}
      </div>
      <Footer initialLogos={initialLogos} />
    </>
  );
}
