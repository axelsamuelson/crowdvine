"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import {
  ShopMegaColumns,
  ShopMegaImageColumn,
} from "@/components/layout/header/shop-mega-panel";
import type { MegaMenuColumn } from "@/lib/nav/shop-mega-menu";
import { cn } from "@/lib/utils";

const CLOSE_DELAY_MS = 200;

/**
 * Desktop shop trigger. Category anchors stay in the document while the
 * panel is closed. Visibility is CSS only.
 */
export function ShopMegaMenu({
  href,
  label,
  columns,
  imageTiles,
  active,
  submenuLabel,
}: {
  href: string;
  label: string;
  columns: readonly MegaMenuColumn[];
  imageTiles: readonly { href: string; label: string; src: string }[];
  active: boolean;
  submenuLabel: string;
}) {
  const menuId = useId();
  const pathname = usePathname();
  const rootRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const pinned = useRef(false);
  const pointerInside = useRef(false);
  const [open, setOpen] = useState(false);

  function clearCloseTimer() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function closeNow() {
    clearCloseTimer();
    pinned.current = false;
    pointerInside.current = false;
    setOpen(false);
  }

  function syncOpen() {
    clearCloseTimer();
    if (pinned.current || pointerInside.current) {
      setOpen(true);
      return;
    }
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
    }, CLOSE_DELAY_MS);
  }

  useEffect(() => {
    closeNow();
    // Close when the visitor navigates. closeNow is stable enough for this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      closeNow();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeNow();
      buttonRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  if (columns.length === 0) {
    return (
      <li>
        <a
          href={href}
          className={cn(
            "font-semibold text-base uppercase",
            active ? "text-foreground" : "text-foreground/50",
          )}
        >
          {label}
        </a>
      </li>
    );
  }

  return (
    <li
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        pointerInside.current = true;
        syncOpen();
      }}
      onMouseLeave={() => {
        pointerInside.current = false;
        pinned.current = false;
        syncOpen();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        closeNow();
        buttonRef.current?.focus();
      }}
    >
      <a
        href={href}
        className={cn(
          "font-semibold text-base uppercase",
          active ? "text-foreground" : "text-foreground/50",
        )}
      >
        {label}
      </a>
      <button
        ref={buttonRef}
        type="button"
        className="ml-0.5 inline-flex size-6 items-center justify-center align-middle text-foreground/50"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={submenuLabel}
        onClick={() => {
          pinned.current = !open;
          pointerInside.current = true;
          clearCloseTimer();
          setOpen(!open);
        }}
      >
        <ChevronDown className="size-3.5" aria-hidden />
      </button>
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-full z-40 h-24 w-full",
          open ? "" : "pointer-events-none",
        )}
      />
      <div
        id={menuId}
        className={cn(
          "fixed inset-x-0 top-[calc(var(--top-spacing)+1px)] z-40 border-y border-[#0A0A0A] bg-background",
          open ? "visible" : "invisible pointer-events-none",
        )}
      >
        <div
          className={cn(
            "grid",
            imageTiles.length > 0 && "grid-cols-[minmax(0,1fr)_16rem]",
          )}
        >
          <ShopMegaColumns columns={columns} layout="grid" />
          <ShopMegaImageColumn tiles={imageTiles} showImages={open} />
        </div>
      </div>
    </li>
  );
}
