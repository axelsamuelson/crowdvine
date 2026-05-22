"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Collection } from "@/lib/shopify/types";
import { useParams } from "next/navigation";
import { useTranslations } from "@/lib/hooks/use-translations";

interface ShopBreadcrumbProps {
  collections: Pick<Collection, "handle" | "title">[];
  className?: string;
}

export function ShopBreadcrumb({
  collections,
  className,
}: ShopBreadcrumbProps) {
  const { t } = useTranslations();
  const params = useParams<{ collection: string }>();
  const currentCollection = params.collection;

  const renderCategoryBreadcrumb = () => {
    if (currentCollection === undefined) return t("common.all");
    const collection = collections.find((c) => c.handle === currentCollection);
    return collection?.title;
  };

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        <BreadcrumbItem className="cursor-pointer text-foreground/50 hover:text-foreground/70">
          <BreadcrumbLink href="/shop" className="font-semibold">
            {t("common.shop")}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbPage className="font-semibold">
          {renderCategoryBreadcrumb()}
        </BreadcrumbPage>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
