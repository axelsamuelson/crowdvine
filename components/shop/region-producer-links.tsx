import Link from "next/link";

import { producersFromProducts } from "@/lib/i18n/wine-region-page";
import type { AppLocale } from "@/lib/i18n/locale";
import type { Product } from "@/lib/shopify/types";

export function RegionProducerLinks({
  products,
  locale,
  regionLabel,
}: {
  products: Product[];
  locale: AppLocale;
  regionLabel: string;
}) {
  const producers = producersFromProducts(products, locale);
  if (producers.length === 0) return null;

  const heading =
    locale === "sv"
      ? `Producenter i ${regionLabel}`
      : `Producers in ${regionLabel}`;

  return (
    <div className="mt-16">
      <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-stone-400">
        {heading}
      </h2>
      <ul className="flex max-w-2xl flex-col gap-2">
        {producers.map((producer) => (
          <li key={producer.id}>
            <Link
              href={producer.href}
              className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
            >
              {producer.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
