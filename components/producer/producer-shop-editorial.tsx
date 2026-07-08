import Link from "next/link";

import type { CollectionData } from "@/lib/crowdvine/collections-data";
import { extractWineText } from "@/lib/i18n/wine-locale";
import type { AppLocale } from "@/lib/i18n/locale";
import { producerPublicPath } from "@/lib/i18n/localized-routes";
import { generateProducerSlug } from "@/lib/producer-handle";
import { getProducerShopEditorialOverride } from "@/lib/producer-shop-content";
import { formatProducerCertification } from "@/lib/product/wine-enrichment";
import { producerShopEditorialHeading } from "@/lib/seo/producer-shop-metadata";

export function producerShopEditorialBio(
  collection: Pick<CollectionData, "handle" | "shortDescription">,
  locale: AppLocale,
): string | null {
  const override = getProducerShopEditorialOverride(collection.handle, locale);
  if (override) return override;

  const text = extractWineText(collection.shortDescription ?? null, locale);
  return text?.trim() ? text.trim() : null;
}

function producerShopSpecParts(
  collection: Pick<
    CollectionData,
    "region" | "certification" | "subregion" | "foundedYear"
  >,
  locale: AppLocale,
): string[] {
  const parts: string[] = [];
  if (collection.region?.trim()) parts.push(collection.region.trim());
  if (collection.subregion?.trim()) parts.push(collection.subregion.trim());
  const cert = formatProducerCertification(collection.certification, locale);
  if (cert) parts.push(cert);
  if (collection.foundedYear != null && collection.foundedYear > 0) {
    parts.push(String(collection.foundedYear));
  }
  return parts;
}

export function ProducerShopEditorialBlock({
  collection,
  locale,
}: {
  collection: CollectionData;
  locale: AppLocale;
}) {
  const bio = producerShopEditorialBio(collection, locale);
  if (!bio) return null;

  const producerName = collection.title.trim();
  const specParts = producerShopSpecParts(collection, locale);
  const profileHref = producerPublicPath(
    generateProducerSlug(producerName),
    locale,
  );

  return (
    <div className="p-sides mt-16 max-w-2xl border-t border-stone-100 pt-12">
      <h2 className="text-sm font-medium uppercase tracking-widest text-stone-400">
        {producerShopEditorialHeading(producerName, locale)}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone-600">
        {bio.split("\n\n").map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>
      {specParts.length > 0 ? (
        <p className="mt-3 text-sm text-stone-500">{specParts.join(" · ")}</p>
      ) : null}
      <Link
        href={profileHref}
        className="mt-4 inline-block text-sm text-stone-600 underline underline-offset-4 hover:text-foreground"
      >
        {locale === "sv"
          ? `Läs mer om ${producerName} →`
          : `Read more about ${producerName} →`}
      </Link>
    </div>
  );
}
