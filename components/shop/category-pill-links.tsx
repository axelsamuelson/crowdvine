import Link from "next/link";

import { cn } from "@/lib/utils";

export type CategoryPillLink = {
  href: string;
  label: string;
  slug: string;
};

/**
 * Horizontal category chip row (region / style / explore).
 * Label + chips use high-contrast foreground tokens — never text-muted-foreground
 * (#737373 fails 4.5:1 on #f0f0f0).
 */
export function CategoryPillLinks({
  heading,
  links,
  ariaLabel,
  testId,
  className,
}: {
  heading: string;
  links: readonly CategoryPillLink[];
  ariaLabel?: string;
  testId?: string;
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <nav
      className={cn("w-full min-w-0", className)}
      aria-label={ariaLabel ?? heading}
      data-testid={testId}
    >
      <span className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
        {heading}
      </span>
      <div className="relative">
        <ul
          className={cn(
            "flex flex-nowrap gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]",
            "[&::-webkit-scrollbar]:hidden",
            // Fade hint on mobile; full wrap-free row on md+ when chips fit.
            "max-md:[mask-image:linear-gradient(to_right,#000_0,#000_calc(100%-28px),transparent_100%)]",
            "md:overflow-visible md:[mask-image:none]",
          )}
        >
          {links.map((link) => (
            <li key={link.slug} className="shrink-0">
              <Link
                href={link.href}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-full",
                  "border border-[#c6c6c6] bg-white px-4 text-sm font-medium tracking-[-0.01em]",
                  "text-foreground no-underline",
                  "min-h-11 md:min-h-9 md:px-3.5 md:text-[13px]",
                  "transition-colors hover:bg-white",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
