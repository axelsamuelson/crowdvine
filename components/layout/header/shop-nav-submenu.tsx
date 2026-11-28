"use client";

import { ChevronDown } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { ShopNavLink } from "@/lib/nav/shop-submenu";
import { cn } from "@/lib/utils";

/**
 * Desktop shop item. The category anchors are always in the document;
 * hover, focus, and the button only change visibility.
 */
export function ShopNavSubmenu({
  href,
  label,
  links,
  active,
  isDirtywineSite,
  submenuLabel,
}: {
  href: string;
  label: string;
  links: readonly ShopNavLink[];
  active: boolean;
  isDirtywineSite: boolean;
  submenuLabel: string;
}) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const itemClass = cn(
    "font-semibold text-base transition-colors duration-200",
    isDirtywineSite ? "normal-case" : "uppercase",
    active ? "text-foreground" : "text-foreground/50",
  );

  if (links.length === 0) {
    return (
      <li>
        <a href={href} className={itemClass}>
          {label}
        </a>
      </li>
    );
  }

  return (
    <li
      className="group/shop relative"
      data-open={open ? "true" : "false"}
      data-dismissed={dismissed ? "true" : "false"}
      onMouseEnter={() => setDismissed(false)}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        setOpen(false);
        setDismissed(true);
        buttonRef.current?.focus();
      }}
    >
      <a href={href} className={itemClass}>
        {label}
      </a>
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          "ml-0.5 inline-flex size-6 items-center justify-center align-middle text-foreground/50",
          isDirtywineSite ? "normal-case" : "uppercase",
        )}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={submenuLabel}
        onClick={() => {
          setDismissed(false);
          setOpen((value) => !value);
        }}
      >
        <ChevronDown className="size-3.5" aria-hidden />
      </button>
      <ul
        id={menuId}
        className={cn(
          "invisible absolute left-0 top-full z-50 mt-2 min-w-52 border border-border bg-background py-1 shadow-sm",
          "group-hover/shop:visible group-focus-within/shop:visible",
          "group-data-[open=true]/shop:visible",
          "group-data-[dismissed=true]/shop:!invisible",
        )}
      >
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className={cn(
                "block px-3 py-2 font-semibold text-sm text-foreground/70 no-underline hover:text-foreground",
                isDirtywineSite ? "normal-case" : "uppercase",
              )}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </li>
  );
}
