"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  producerShopPathFromName,
  shopPathForLocale,
} from "@/lib/i18n/localized-routes";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

interface ProductBreadcrumbsProps {
  title: string;
  producerName?: string | null;
  productType?: string | null;
  className?: string;
}

/** PDP breadcrumbs: Shop → Producer wines → Wine (wine boxes keep Wine Boxes segment). */
export function ProductBreadcrumbs({
  title,
  producerName,
  productType,
  className,
}: ProductBreadcrumbsProps) {
  const { t, context } = useTranslations();
  const producer = producerName?.trim();
  const shopPath = shopPathForLocale(context.locale);

  return (
    <Breadcrumb className={cn("col-span-full mb-4 md:mb-8", className)}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={shopPath} prefetch>
              {t("nav.shopAll")}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {productType === "wine-box" ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`${shopPath}/wine-boxes`} prefetch>
                  {t("product.wineBoxes")}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        ) : producer ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={producerShopPathFromName(producer, context.locale)}
                  prefetch
                >
                  {t("product.pdp.breadcrumbProducerWines", { producer })}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        ) : null}

        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
