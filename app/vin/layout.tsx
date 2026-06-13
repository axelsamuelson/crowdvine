import { ShopLayoutShell } from "@/components/shop/shop-layout-shell";

export default async function VinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShopLayoutShell>{children}</ShopLayoutShell>;
}
