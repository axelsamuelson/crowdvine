"use client";

import * as React from "react";

/**
 * Minimal VisuallyHidden helper (shadcn-style) to avoid depending on
 * @radix-ui/react-visually-hidden at build time.
 */
export function VisuallyHidden({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const className =
    "sr-only absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 m-0 [clip:rect(0,0,0,0)]";

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      className: [className, (children as any).props?.className]
        .filter(Boolean)
        .join(" "),
    });
  }

  return <span className={className}>{children}</span>;
}


