import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LegalNodeProps = {
  children: ReactNode;
  className?: string;
};

export function LegalProse({ children, className }: LegalNodeProps) {
  return (
    <div
      className={cn("space-y-6 text-muted-foreground leading-relaxed", className)}
    >
      {children}
    </div>
  );
}

export function LegalH2({ children, className }: LegalNodeProps) {
  return (
    <h2
      className={cn("text-xl font-medium text-foreground pt-4", className)}
    >
      {children}
    </h2>
  );
}

export function LegalH3({ children, className }: LegalNodeProps) {
  return (
    <h3 className={cn("text-base font-medium text-foreground", className)}>
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
  const classes = cn(
    "underline underline-offset-2 text-foreground",
    className,
  );
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
    <strong className={cn("font-medium text-foreground", className)}>
      {children}
    </strong>
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
        "border-b border-border py-2 pr-4 text-left align-top text-foreground",
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
        className,
      )}
    >
      {children}
    </td>
  );
}
