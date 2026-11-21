import { headers } from "next/headers";

import { ShopLayoutShell } from "@/components/shop/shop-layout-shell";
import {
  notFoundUnlessShopSlug,
  shopPathSlug,
} from "@/lib/shop/shop-slug-resolution";

export const revalidate = 300;

export default async function VinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const slug = shopPathSlug(headerList.get("x-pathname") ?? "", "sv");
  if (slug) await notFoundUnlessShopSlug(slug, "sv");

  return <ShopLayoutShell>{children}</ShopLayoutShell>;
}
