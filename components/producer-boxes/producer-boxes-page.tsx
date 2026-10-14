import Link from "next/link";
import type { ReactNode } from "react";
import { ProductCard } from "@/app/vin/components/product-card";
import { ShopBreadcrumb } from "@/app/vin/components/shop-breadcrumb";
import { AddProducerBoxButton } from "@/components/producer-boxes/add-producer-box-button";
import { fetchProductsData } from "@/lib/crowdvine/products-data";
import type { AppLocale } from "@/lib/i18n/locale";
import { producerShopPagePath } from "@/lib/i18n/producer-shop-page";
import { mapProductDataToShopProducts } from "@/lib/map-product-data-to-shop-product";
import { producerBoxContentsLine } from "@/lib/producer-boxes/contents-line";
import {
  PRODUCER_BOXES_COPY,
  PRODUCER_BOXES_FAQ,
  PRODUCER_BOXES_INTRO_LINKS,
  PRODUCER_BOXES_PUBLISHED,
  type ProducerBoxTextLink,
} from "@/lib/producer-boxes/config";
import { loadResolvedProducerBoxes } from "@/lib/producer-boxes/load";
import {
  batchAddItems,
  type ResolvedProducerBoxWine,
} from "@/lib/producer-boxes/match";
import { buildProducerBoxesJsonLd } from "@/lib/producer-boxes/metadata";
import type { Product } from "@/lib/shopify/types";
import { formatPrice } from "@/lib/shopify/utils";

function slotNote(
  slot: ResolvedProducerBoxWine,
  copy: {
    missing: string;
    unpublished: string;
    notForSale: string;
    wrongProducer: string;
  },
): string | null {
  if (slot.status === "missing" || slot.status === "producer_missing") return copy.missing;
  if (slot.status === "unpublished") return copy.unpublished;
  if (slot.status === "not_for_sale") return copy.notForSale;
  if (slot.status === "producer_mismatch") return copy.wrongProducer;
  return null;
}

function boxCardProduct(product: Product, slot: ResolvedProducerBoxWine): Product {
  const catalogTitle =
    slot.wineName && slot.vintage
      ? `${slot.wineName} ${slot.vintage}`
      : product.title;
  const title =
    slot.quantity > 1 ? `${slot.quantity} x ${catalogTitle}` : catalogTitle;
  const withAlt = <T extends { altText?: string }>(image: T): T => ({
    ...image,
    altText: catalogTitle,
  });
  return {
    ...product,
    title,
    featuredImage: product.featuredImage
      ? withAlt(product.featuredImage)
      : product.featuredImage,
    images: product.images.map((image) => withAlt(image)),
  };
}

function formatSek(cents: number): string {
  return formatPrice(cents / 100, "SEK", "sv-SE");
}

function LinkedCopy({
  text,
  links,
}: {
  text: string;
  links: readonly ProducerBoxTextLink[];
}) {
  const nodes: ReactNode[] = [];
  let rest = text;
  links.forEach((link, index) => {
    const at = rest.indexOf(link.phrase);
    if (at < 0) return;
    if (at > 0) nodes.push(rest.slice(0, at));
    nodes.push(
      <Link
        key={`${link.href}-${index}`}
        href={link.href}
        className="text-stone-900 underline underline-offset-4"
      >
        {link.phrase}
      </Link>,
    );
    rest = rest.slice(at + link.phrase.length);
  });
  if (rest) nodes.push(rest);
  return <>{nodes}</>;
}

function MissingBoxWine({
  label,
  note,
}: {
  label: string;
  note: string | null;
}) {
  return (
    <div className="relative z-10 w-full aspect-[3/4] bg-muted md:aspect-square">
      <div className="absolute inset-0 px-3 py-3 md:px-4">
        <p className="line-clamp-2 text-[8px] font-semibold uppercase leading-tight md:text-sm">
          {label}
        </p>
        {note ? (
          <p className="mt-1 text-[7px] uppercase text-muted-foreground md:text-xs">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export async function ProducerBoxesPage({ locale }: { locale: AppLocale }) {
  const copy = PRODUCER_BOXES_COPY[locale];
  const loaded = await loadResolvedProducerBoxes();
  const jsonLd = buildProducerBoxesJsonLd(locale, loaded.boxes);
  const wineIds = loaded.boxes.flatMap((box) =>
    box.slots.flatMap((slot) => (slot.wineId ? [slot.wineId] : [])),
  );
  const products = wineIds.length
    ? mapProductDataToShopProducts(
        await fetchProductsData({
          ids: wineIds,
          isB2BSite: false,
        }),
      )
    : [];
  const productById = new Map(products.map((product) => [product.id, product]));
  let imageIndex = 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.collection) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.faq) }}
      />
      <div className="p-sides py-8">
        <div className="mb-8 max-w-2xl">
          {!PRODUCER_BOXES_PUBLISHED ? (
            <p className="mb-6 text-sm text-stone-500">{copy.draft}</p>
          ) : null}
          <h1 className="mb-3 text-3xl font-medium text-stone-900">{copy.h1}</h1>
          <p className="leading-relaxed text-stone-600">
            <LinkedCopy text={copy.intro} links={PRODUCER_BOXES_INTRO_LINKS[locale]} />
          </p>
          {loaded.loadError ? (
            <p className="mt-3 text-sm text-stone-600">{copy.loadError}</p>
          ) : null}
        </div>

        <div className="mb-8 w-full pr-sides">
          <div className="grid w-full grid-cols-3 items-center">
            <ShopBreadcrumb
              collections={[]}
              breadcrumbLabel={copy.breadcrumb}
              className="ml-1"
            />
          </div>
        </div>

        <h2 className="mb-8 text-2xl font-semibold text-stone-900">
          {copy.boxesHeading}
        </h2>
        <div className="flex flex-col gap-16">
          {loaded.boxes.map((box) => {
            const producerLabel = box.producerName ?? box.definition.producerName;
            const producerHref = box.producerFound
              ? producerShopPagePath(producerLabel, locale)
              : null;
            const items = batchAddItems(box);
            return (
              <section key={box.definition.id} id={`box-${box.definition.id}`}>
                <div className="mb-8 flex w-full flex-col gap-y-3 bg-white p-4 md:grid md:grid-cols-2 md:rounded-md">
                  <div className="col-span-1">
                    <h3 className="text-2xl font-semibold text-stone-900">
                      {box.definition.name[locale]}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-700">
                      {producerBoxContentsLine(box.slots, locale)}
                    </p>
                    <p className="mt-2 text-sm font-normal text-muted-foreground">
                      {copy.producer}:{" "}
                      {producerHref ? (
                        <Link
                          href={producerHref}
                          className="text-stone-900 underline underline-offset-4 hover:text-stone-900"
                        >
                          {producerLabel}
                        </Link>
                      ) : (
                        <span>
                          {producerLabel}. {copy.producerMissing}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="col-span-1 text-sm font-medium leading-relaxed text-stone-900">
                    {box.definition.story[locale]}
                  </p>
                  <div className="col-span-1 flex items-end text-2xl font-semibold text-stone-900">
                    {box.totalCents != null ? (
                      <p>
                        {formatSek(box.totalCents)}
                        <span className="mt-0.5 block text-xs font-normal text-stone-500">
                          {copy.inclVat}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div className="col-span-1 self-end">
                    <AddProducerBoxButton
                      boxId={box.definition.id}
                      items={items}
                      label={copy.add}
                      pendingLabel={copy.adding}
                      addedLabel={copy.added}
                      unavailableLabel={copy.unavailable}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0 md:grid-cols-2 xl:grid-cols-3">
                  {box.slots.map((slot) => {
                    const product: Product | undefined = slot.wineId
                      ? productById.get(slot.wineId)
                      : undefined;
                    const index = imageIndex;
                    imageIndex += 1;
                    const note = slotNote(slot, copy);
                    const quantityLabel =
                      slot.quantity > 1
                        ? `${slot.quantity} x ${slot.wineName ?? slot.wineId}`
                        : null;
                    if (!product) {
                      return (
                        <MissingBoxWine
                          key={`${box.definition.id}-${slot.wineId}`}
                          label={quantityLabel ?? slot.wineName ?? slot.wineId}
                          note={note}
                        />
                      );
                    }
                    return (
                      <ProductCard
                        key={`${product.id}-${slot.quantity}`}
                        product={boxCardProduct(product, slot)}
                        index={index}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-16 max-w-2xl border-t border-stone-200 pt-10">
          <h2 className="mb-6 text-2xl font-semibold text-stone-900">
            {copy.faqHeading}
          </h2>
          <div className="flex flex-col gap-8">
            {PRODUCER_BOXES_FAQ[locale].map((item) => (
              <div key={item.question}>
                <h3 className="text-lg font-semibold text-stone-900">
                  {item.question}
                </h3>
                <p className="mt-2 leading-relaxed text-stone-600">
                  <LinkedCopy text={item.answer} links={item.link ? [item.link] : []} />
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
