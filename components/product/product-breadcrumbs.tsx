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
import { getProducerHandle } from "@/lib/producer-handle";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

interface ProductBreadcrumbsProps {
  title: string;
  producerName?: string | null;
  productType?: string | null;
  className?: string;
}

/** PDP breadcrumbs: Shop → Producer → Wine (wine boxes keep Wine Boxes segment). */
export function ProductBreadcrumbs({
  title,
  producerName,
  productType,
  className,
}: ProductBreadcrumbsProps) {
  const { t } = useTranslations();
  const producer = producerName?.trim();
  const producerHandle = producer ? getProducerHandle(producer) : null;

  return (
    <Breadcrumb className={cn("col-span-full mb-4 md:mb-8", className)}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/shop" prefetch>
              {t("common.shop")}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {productType === "wine-box" ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/shop/wine-boxes" prefetch>
                  {t("product.wineBoxes")}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        ) : producer && producerHandle ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/shop/${producerHandle}`} prefetch>
                  {producer}
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
