import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

function productHref(handle: string, locale: AppLocale): string {
  return locale === "en" ? `/product/${handle}` : `/produkt/${handle}`;
}

/**
 * Server-rendered primary CTA for list cards. Works without JS (links to PDP).
 * Interactive ProductCard may overlay a client sheet CTA after hydration.
 */
export function SsrReserveLink({
  handle,
  locale = "sv",
  className,
}: {
  handle: string;
  locale?: AppLocale;
  className?: string;
}) {
  return (
    <Link
      href={productHref(handle, locale)}
      className={cn(
        "inline-flex h-10 w-full items-center justify-center rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-black/90",
        className,
      )}
      prefetch
    >
      {translate(locale, "shop.reserve")}
    </Link>
  );
}
