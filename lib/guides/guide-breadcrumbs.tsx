import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type GuideBreadcrumbCrumb = {
  label: string;
  /** Omit href for the current page (last crumb). */
  href?: string;
};

const LINK_CLASS =
  "font-medium underline underline-offset-4 decoration-foreground/25 hover:text-foreground hover:decoration-foreground/60";

/**
 * Visible guide breadcrumb trail. Parent crumbs are real internal links
 * (Home, Guides hub); the current page is plain text.
 *
 * Optional `mobileBack`: below `md`, replace the trail with a single back
 * link; from `md` up keep the full trail.
 */
export function GuideBreadcrumbs({
  crumbs,
  className,
  mobileBack,
}: {
  crumbs: GuideBreadcrumbCrumb[];
  className?: string;
  mobileBack?: { label: string; href: string };
}) {
  const trail = (
    <BreadcrumbList>
      {crumbs.flatMap((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const nodes = [];
        if (index > 0) {
          nodes.push(
            <BreadcrumbSeparator key={`sep-${crumb.label}-${index}`} />,
          );
        }
        nodes.push(
          <BreadcrumbItem key={`item-${crumb.label}-${index}`}>
            {isLast || !crumb.href ? (
              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={crumb.href} className={LINK_CLASS}>
                  {crumb.label}
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>,
        );
        return nodes;
      })}
    </BreadcrumbList>
  );

  if (!mobileBack) {
    return (
      <Breadcrumb className={className}>
        {trail}
      </Breadcrumb>
    );
  }

  return (
    <div className={className}>
      <p className="md:hidden">
        <Link href={mobileBack.href} className={LINK_CLASS}>
          {mobileBack.label}
        </Link>
      </p>
      <Breadcrumb className="hidden md:block">{trail}</Breadcrumb>
    </div>
  );
}

export type GuideBreadcrumbJsonLdItem = {
  name: string;
  /** Absolute URL. Omit for the current page. */
  item?: string;
};

/** BreadcrumbList JSON-LD. Last crumb should omit `item` (current page). */
export function buildGuideBreadcrumbJsonLd(
  items: GuideBreadcrumbJsonLdItem[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const entry: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
      };
      if (item.item) {
        entry.item = item.item;
      }
      return entry;
    }),
  };
}
