"use client";

import { CONTACT_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import {
  classifyB2bContactCta,
  trackB2bContactClicked,
} from "@/lib/analytics/b2b-track-client";

const linkVariants = cva(
  "leading-tight transition-colors hover:underline ease-out duration-200 whitespace-nowrap",
  {
    variants: {
      invert: {
        true: "text-background/50 hover:text-background",
        false: "text-muted-foreground hover:text-foreground",
      },
      size: {
        sm: "text-xs 2xl:text-sm",
        base: "text-sm 2xl:text-base",
      },
    },
    defaultVariants: {
      invert: false,
      size: "sm",
    },
  },
);

interface SidebarLinksProps {
  className?: string;
  invert?: boolean;
  size?: "sm" | "base";
}

export function SidebarLinks({ className, invert, size }: SidebarLinksProps) {
  const isDirtyWine = useB2BModeServerHint();

  return (
    <ul className={cn("flex flex-row gap-2 justify-between", className)}>
      {CONTACT_LINKS.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            target="_blank"
            className={linkVariants({ invert, size })}
            onClick={() => {
              if (!isDirtyWine) return;
              try {
                trackB2bContactClicked({
                  cta: classifyB2bContactCta(link.href),
                  href: link.href,
                });
              } catch {
                // never block navigation
              }
            }}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
