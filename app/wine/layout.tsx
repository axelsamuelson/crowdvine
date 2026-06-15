import { ShopLayoutShell } from "@/components/shop/shop-layout-shell";

export const revalidate = 300;

export default async function WineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShopLayoutShell>{children}</ShopLayoutShell>;
}
