"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoSvg } from "./logo-svg";
import type { SiteLogos } from "@/lib/context/site-logo-provider";
import { useShoppingContextOptional } from "@/lib/context/shopping-context-provider";
import { cn } from "@/lib/utils";

/**
 * Checkout-only chrome: brand logo + back-to-cart. No site nav / profile / badge.
 */
export function CheckoutMinimalHeader(props: { initialLogos?: SiteLogos }) {
  const shopping = useShoppingContextOptional();
  const t = shopping?.t ?? ((k: string) => k);
  const router = useRouter();
  const pathname = usePathname();
  const locale = shopping?.context.locale === "en" ? "en" : "sv";

  const backLabel =
    locale === "en"
      ? "Back to cart"
      : t("checkout.backToCart") !== "checkout.backToCart"
        ? t("checkout.backToCart")
        : "Tillbaka till varukorgen";

  const onBack = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cart-open-request"));
    }
    // Leave checkout so the cart drawer is usable on the storefront.
    if (
      pathname?.startsWith("/checkout") ||
      pathname?.startsWith("/en/checkout")
    ) {
      router.push(locale === "en" ? "/en" : "/");
    }
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background"
      data-testid="checkout-minimal-header"
    >
      <div className="mx-auto flex h-[var(--top-spacing)] max-w-[1280px] items-center justify-between gap-4 px-6">
        <Link href="/" prefetch className="shrink-0" aria-label="PACT">
          <LogoSvg
            className="h-8 w-auto md:h-10"
            initialLogos={props.initialLogos}
          />
        </Link>
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "text-sm font-medium text-foreground underline-offset-4 hover:underline",
          )}
          data-testid="checkout-back-to-cart"
        >
          {backLabel}
        </button>
      </div>
    </header>
  );
}
