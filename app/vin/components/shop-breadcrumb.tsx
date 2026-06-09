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
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "@/lib/hooks/use-translations";

interface ShopBreadcrumbProps {
  collections: Pick<Collection, "handle" | "title">[];
  className?: string;
  breadcrumbLabel?: string;
}

export function ShopBreadcrumb({
  collections,
  className,
  breadcrumbLabel,
}: ShopBreadcrumbProps) {
  const { t } = useTranslations();
  const pathname = usePathname();
  const params = useParams<{ collection: string }>();
  const currentCollection = params.collection;
  const isRootShop =
    (pathname === "/vin" || pathname === "/wine") &&
    currentCollection === undefined;

  const renderCategoryBreadcrumb = () => {
    if (breadcrumbLabel) return breadcrumbLabel;
    if (currentCollection === undefined) return t("common.all");
    const collection = collections.find((c) => c.handle === currentCollection);
    return collection?.title;
  };

  if (isRootShop) {
    return (
      <Breadcrumb className={className}>
        <BreadcrumbList>
          <BreadcrumbPage className="font-semibold">
            {t("nav.shopAll")}
          </BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        <BreadcrumbItem className="cursor-pointer text-foreground/50 hover:text-foreground/70">
          <BreadcrumbLink href="/vin" className="font-semibold">
            {t("nav.shopAll")}
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
