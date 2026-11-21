import { headers } from "next/headers";

import { ShopLayoutShell } from "@/components/shop/shop-layout-shell";
import {
  notFoundUnlessShopSlug,
  shopPathSlug,
} from "@/lib/shop/shop-slug-resolution";

export const revalidate = 300;

export default async function WineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const slug = shopPathSlug(headerList.get("x-pathname") ?? "", "en");
  if (slug) await notFoundUnlessShopSlug(slug, "en");

  return <ShopLayoutShell>{children}</ShopLayoutShell>;
}
