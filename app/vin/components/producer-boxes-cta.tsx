"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import { useTranslations } from "@/lib/hooks/use-translations";
import { producerBoxesPath } from "@/lib/producer-boxes/config";
import { cn } from "@/lib/utils";

function isRootShopPath(pathname: string): boolean {
  return pathname === "/vin" || pathname === "/wine";
}

export function ProducerBoxesCta({
  className,
  ssrPathname,
}: {
  className?: string;
  ssrPathname: string;
}) {
  const pathname = usePathname();
  const { t, context } = useTranslations();
  const isDirtywineSite = useB2BModeServerHint();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep the first paint aligned with the server HTML. A click can change the
  // URL before hydration finishes, and following that live path rewrites the link.
  const activePath = mounted ? pathname : ssrPathname;
  const isRootShop = isRootShopPath(activePath);
  const href = producerBoxesPath(context.locale);

  if (isDirtywineSite) return null;

  return (
    <div className={isRootShop ? undefined : "hidden"}>
      <Button
        asChild
        className={cn(
          "h-11 w-full rounded-md bg-black px-5 text-white hover:bg-black/90",
          className,
        )}
      >
        <Link
          href={href}
          onClick={(event) => {
            if (mounted) return;
            event.preventDefault();
            window.location.assign(href);
          }}
        >
          {t("shop.producerBoxesCta")}
        </Link>
      </Button>
    </div>
  );
}
