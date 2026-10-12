"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { SystembolagetBagIcon } from "@/components/guides/systembolaget-bag-icon";

type SystembolagetProducerMarkProps = {
  label: string;
};

export function SystembolagetProducerMark({
  label,
}: SystembolagetProducerMarkProps) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openedAt = useRef(0);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxLeft = Math.max(8, window.innerWidth - 220);
    setPosition({
      top: rect.bottom + 6,
      left: Math.min(Math.max(8, rect.left), maxLeft),
    });
  }

  function show() {
    openedAt.current = Date.now();
    place();
    setOpen(true);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex size-4 shrink-0 translate-y-px items-center justify-center align-middle text-muted-foreground"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => {
          if (open && Date.now() - openedAt.current > 400) {
            setOpen(false);
            return;
          }
          show();
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== "mouse") return;
          show();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          setOpen(false);
        }}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <SystembolagetBagIcon className="size-4" />
      </button>
      {open
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
