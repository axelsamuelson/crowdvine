import Link from "next/link";
import { ShopBreadcrumb } from "@/app/vin/components/shop-breadcrumb";
import { AddProducerBoxButton } from "@/components/producer-boxes/add-producer-box-button";
import type { AppLocale } from "@/lib/i18n/locale";
import { productPagePath } from "@/lib/i18n/localized-routes";
import { producerShopPagePath } from "@/lib/i18n/producer-shop-page";
import { translate } from "@/lib/i18n/messages";
import {
  PRODUCER_BOXES_COPY,
  PRODUCER_BOXES_PUBLISHED,
} from "@/lib/producer-boxes/config";
import { loadResolvedProducerBoxes } from "@/lib/producer-boxes/load";
import { batchAddItems, type ResolvedProducerBoxWine } from "@/lib/producer-boxes/match";
import { buildProducerBoxesJsonLd } from "@/lib/producer-boxes/metadata";
import { formatPrice } from "@/lib/shopify/utils";

function wineTypeLabel(color: string | null | undefined, locale: AppLocale): string {
  if (!color) return "";
  const known: Record<string, string> = {
    Red: "shop.wineColorRed",
    White: "shop.wineColorWhite",
    Orange: "shop.wineColorOrange",
    Rose: "shop.wineColorRose",
  };
  const key = known[color];
  if (key) return translate(locale, key);
  if (color === "Sparkling") return locale === "sv" ? "Mousserande" : "Sparkling";
  if (color === "Red & White") {
    return locale === "sv" ? "Rött och vitt" : "Red and white";
  }
  return color;
}

function slotNote(
  slot: ResolvedProducerBoxWine,
  copy: {
    missing: string;
    unpublished: string;
    notForSale: string;
    ambiguous: string;
  },
): string | null {
  if (slot.status === "missing" || slot.status === "producer_missing") return copy.missing;
  if (slot.status === "unpublished") return copy.unpublished;
  if (slot.status === "not_for_sale") return copy.notForSale;
  if (slot.status === "ambiguous") return copy.ambiguous;
  return null;
}

function formatSek(cents: number): string {
  return formatPrice(cents / 100, "SEK", "sv-SE");
}

export async function ProducerBoxesPage({ locale }: { locale: AppLocale }) {
  const copy = PRODUCER_BOXES_COPY[locale];
  const loaded = await loadResolvedProducerBoxes();
  const jsonLd = buildProducerBoxesJsonLd(locale, loaded.boxes);

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
      <div className="p-sides py-8">
        <ShopBreadcrumb
          collections={[]}
          breadcrumbLabel={copy.breadcrumb}
          className="mb-8"
        />
        {!PRODUCER_BOXES_PUBLISHED ? (
          <p className="mb-6 max-w-2xl text-sm text-stone-500">{copy.draft}</p>
        ) : null}
        <div className="mb-10 max-w-2xl">
          <h1 className="mb-3 text-3xl font-medium text-stone-900">{copy.h1}</h1>
          <p className="leading-relaxed text-stone-600">{copy.intro}</p>
          {loaded.loadError ? (
            <p className="mt-3 text-sm text-stone-600">{copy.loadError}</p>
          ) : null}
        </div>
        <div className="flex max-w-2xl flex-col gap-8">
          {loaded.boxes.map((box) => {
            const producerLabel = box.producerName ?? box.definition.producerName;
            const producerHref = box.producerFound
              ? producerShopPagePath(producerLabel, locale)
              : null;
            const items = batchAddItems(box);
            return (
              <article
                key={box.definition.id}
                id={`box-${box.definition.id}`}
                className="rounded-xl border border-stone-200 p-6"
              >
                <h2 className="text-xl font-medium text-stone-900">
                  {box.definition.name[locale]}
                </h2>
                <p className="mt-2 text-sm text-stone-600">
                  {copy.producer}:{" "}
                  {producerHref ? (
                    <Link
                      href={producerHref}
                      className="text-stone-900 underline underline-offset-4"
                    >
                      {producerLabel}
                    </Link>
                  ) : (
                    <span>
                      {producerLabel}. {copy.producerMissing}
                    </span>
                  )}
                </p>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-700">
                  {box.definition.story[locale]}
                </p>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500">
                        <th scope="col" className="py-2 pr-4 font-medium">{copy.wine}</th>
                        <th scope="col" className="py-2 pr-4 font-medium">{copy.type}</th>
                        <th scope="col" className="py-2 text-right font-medium">{copy.price}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {box.slots.map((slot) => {
                        const note = slotNote(slot, copy);
                        const wineHref =
                          slot.handle && slot.status !== "missing"
                            ? productPagePath(
                                slot.handle,
                                locale === "sv" ? "produkt" : "product",
                              )
                            : null;
                        const label = slot.wineName ?? slot.configuredName;
                        return (
                          <tr
                            key={`${box.definition.id}-${slot.configuredName}`}
                            className="border-b border-stone-100"
                          >
                            <td className="py-2 pr-4 text-stone-900">
                              {wineHref ? (
                                <Link href={wineHref} className="underline underline-offset-4">
                                  {label}
                                </Link>
                              ) : (
                                label
                              )}
                              {slot.vintage ? (
                                <span className="text-stone-500"> {slot.vintage}</span>
                              ) : null}
                              {note ? (
                                <span className="mt-0.5 block text-xs text-stone-500">
                                  {note}
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 pr-4 text-stone-700">
                              {wineTypeLabel(slot.color, locale)}
                            </td>
                            <td className="py-2 text-right text-stone-900">
                              {slot.priceCents != null ? formatSek(slot.priceCents) : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {box.totalCents != null ? (
                      <tfoot>
                        <tr>
                          <td className="pt-3 font-medium text-stone-900" colSpan={2}>
                            {copy.total}
                          </td>
                          <td className="pt-3 text-right font-medium text-stone-900">
                            {formatSek(box.totalCents)}
                            <span className="mt-0.5 block text-xs font-normal text-stone-500">
                              {copy.inclVat}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                </div>
                <AddProducerBoxButton
                  boxId={box.definition.id}
                  items={items}
                  label={copy.add}
                  pendingLabel={copy.adding}
                  addedLabel={copy.added}
                  unavailableLabel={copy.unavailable}
                />
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
