import { ShopLayoutShell } from "@/components/shop/shop-layout-shell";

export const revalidate = 300;

export default async function VinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShopLayoutShell>{children}</ShopLayoutShell>;
}
