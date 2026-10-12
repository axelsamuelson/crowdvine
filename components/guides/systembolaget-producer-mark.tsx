"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { SystembolagetBagIcon } from "@/components/guides/systembolaget-bag-icon";

type SystembolagetProducerMarkProps = {
  label: string;
  href: string;
};

export function SystembolagetProducerMark({
  label,
  href,
}: SystembolagetProducerMarkProps) {
  const tooltipId = useId();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  function place(target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - 220);
    setPosition({
      top: rect.bottom + 6,
      left: Math.min(Math.max(8, rect.left), maxLeft),
    });
  }

  function show(target: HTMLElement) {
    place(target);
    setOpen(true);
  }

  return (
    <>
      <Link
        href={href}
        className="inline-flex size-4 shrink-0 translate-y-px items-center justify-center align-middle text-muted-foreground hover:text-foreground"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType !== "mouse") return;
          show(event.currentTarget);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          setOpen(false);
        }}
        onFocus={(event) => {
          show(event.currentTarget);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <SystembolagetBagIcon className="size-4" />
      </Link>
      {mounted && open
        ? createPortal(
            <span
              id={tooltipId}
              role="tooltip"
              style={{ top: position.top, left: position.left }}
              className="pointer-events-none fixed z-50 max-w-[13.5rem] rounded-md border border-border bg-background px-2 py-1 text-left text-xs leading-snug text-foreground shadow-sm"
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
