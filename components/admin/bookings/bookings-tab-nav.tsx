"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabClass =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-medium transition-colors";

export function BookingsTabNav() {
  const pathname = usePathname();
  const isDirtyWine = pathname === "/admin/bookings/dirty-wine";

  return (
    <nav
      className="inline-flex gap-0 rounded-xl border border-border bg-muted p-1 text-muted-foreground dark:border-zinc-700 dark:bg-zinc-900"
      aria-label="Bookings source"
    >
      <Link
        href="/admin/bookings"
        className={cn(
          tabClass,
          !isDirtyWine
            ? "bg-background text-foreground shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
            : "hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-100",
        )}
        aria-current={!isDirtyWine ? "page" : undefined}
      >
        PACT
      </Link>
      <Link
        href="/admin/bookings/dirty-wine"
        className={cn(
          tabClass,
          isDirtyWine
            ? "bg-background text-foreground shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
            : "hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-100",
        )}
        aria-current={isDirtyWine ? "page" : undefined}
      >
        Dirty Wine
      </Link>
    </nav>
  );
}
