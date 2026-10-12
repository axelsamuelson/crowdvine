"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import { useTranslations } from "@/lib/hooks/use-translations";
import { producerBoxesPath } from "@/lib/producer-boxes/config";
import { cn } from "@/lib/utils";

export function ProducerBoxesCta({ className }: { className?: string }) {
  const pathname = usePathname();
  const { t, context } = useTranslations();
  const isDirtywineSite = useB2BModeServerHint();
  const isRootShop = pathname === "/vin" || pathname === "/wine";

  if (isDirtywineSite) return null;

  return (
    <Button
      asChild
      className={cn(
        "h-11 w-full rounded-md bg-black px-5 text-white hover:bg-black/90",
        className,
        !isRootShop && "hidden",
      )}
    >
      <Link href={producerBoxesPath(context.locale)}>
        {t("shop.producerBoxesCta")}
      </Link>
    </Button>
  );
}
