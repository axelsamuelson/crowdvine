import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/locale";
import { resolveNaturalWineColorCategoryLink } from "@/lib/shop/natural-wine-color-category-link";

interface WinePdpColorCategoryLinkProps {
  locale: AppLocale;
  color?: string | null;
  farming?: string | null;
}

export function WinePdpColorCategoryLink({
  locale,
  color,
  farming,
}: WinePdpColorCategoryLinkProps) {
  const link = resolveNaturalWineColorCategoryLink(locale, { color, farming });
  if (!link) return null;

  return (
    <Link
      href={link.href}
      className="text-sm text-stone-600 underline underline-offset-2 hover:text-foreground"
    >
      {link.label}
    </Link>
  );
}
