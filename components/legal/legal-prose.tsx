import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LegalNodeProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Body / table values per design review: neutral-700 */
const BODY = "text-[#404040]";
/** Headings and bold: near-black */
const INK = "text-[#0A0A0A]";
/** Clear fixed header (~legal chrome) when jumping to #punkt-N */
const SCROLL_MT = "scroll-mt-24 md:scroll-mt-28";

export function LegalProse({ children, className }: LegalNodeProps) {
  return (
    <div className={cn("space-y-6 leading-relaxed", BODY, className)}>
      {children}
    </div>
  );
}

export function LegalH2({ children, className, id }: LegalNodeProps) {
  return (
    <h2
      id={id}
      className={cn(
        "text-xl font-medium pt-4",
        INK,
        SCROLL_MT,
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function LegalH3({ children, className, id }: LegalNodeProps) {
  return (
    <h3
      id={id}
      className={cn(
        // 16–17px medium; 32px above, 8px below
        "text-base sm:text-[17px] font-medium mt-8 mb-2",
        INK,
        SCROLL_MT,
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function LegalP({ children, className }: LegalNodeProps) {
  return <p className={cn(className)}>{children}</p>;
}

export function LegalList({ children, className }: LegalNodeProps) {
  return (
    <ul className={cn("list-disc pl-5 space-y-2", className)}>{children}</ul>
  );
}

export function LegalOl({ children, className }: LegalNodeProps) {
  return (
    <ol className={cn("list-decimal pl-5 space-y-2", className)}>{children}</ol>
  );
}

function isExternalHref(href: string): boolean {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:")
  );
}

export function LegalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const classes = cn("underline underline-offset-2", INK, className);
  if (isExternalHref(href)) {
    const external = href.startsWith("http");
    return (
      <a
        href={href}
        className={classes}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export function LegalStrong({ children, className }: LegalNodeProps) {
  return (
    <strong className={cn("font-medium", INK, className)}>{children}</strong>
  );
}

export function LegalTable({ children, className }: LegalNodeProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

export function LegalTh({ children, className }: LegalNodeProps) {
  return (
    <th
      className={cn(
        // Label column ~40% / 220px at desktop (design review)
        "border-b border-border py-2 pr-4 text-left align-top font-medium w-[40%] md:w-[220px] md:max-w-[220px]",
        INK,
        className,
      )}
    >
      {children}
    </th>
  );
}

export function LegalTd({ children, className }: LegalNodeProps) {
  return (
    <td
      className={cn(
        "border-b border-border py-2 pr-4 text-left align-top",
        BODY,
        className,
      )}
    >
      {children}
    </td>
  );
}
