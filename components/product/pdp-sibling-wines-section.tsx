import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/locale";
import { productPublicPath } from "@/lib/i18n/localized-routes";
import type { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";

interface PdpSiblingWinesSectionProps {
  producerName: string;
  locale: AppLocale;
  wines: Product[];
  className?: string;
}

function siblingHeading(producerName: string, locale: AppLocale): string {
  const name = producerName.trim();
  return locale === "sv"
    ? `Fler viner från ${name}`
    : `More wines from ${name}`;
}

/**
 * Server-rendered sibling wine links for SEO internal linking.
 * Real &lt;a&gt; tags (via next/link) — not a client carousel.
 */
export function PdpSiblingWinesSection({
  producerName,
  locale,
  wines,
  className,
}: PdpSiblingWinesSectionProps) {
  if (wines.length === 0 || !producerName.trim()) return null;

  return (
    <section
      className={cn("col-span-full w-full bg-muted px-sides py-8", className)}
      aria-label={siblingHeading(producerName, locale)}
    >
      <h2 className="mb-4 text-sm font-semibold text-foreground">
        {siblingHeading(producerName, locale)}
      </h2>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
        {wines.map((wine) => (
          <li key={wine.id}>
            <Link
              href={productPublicPath(wine.handle, locale)}
              className="text-sm text-stone-600 underline underline-offset-4 hover:text-foreground"
            >
              {wine.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
