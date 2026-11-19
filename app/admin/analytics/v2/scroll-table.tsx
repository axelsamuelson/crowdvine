"use client";

import type { ReactNode } from "react";

/** Horizontally scrollable table with sticky first column + edge fade. */
export function ScrollTable({
  children,
  minWidth = "640px",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <table
          className="w-full text-left text-sm"
          style={{ minWidth }}
        >
          {children}
        </table>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-white to-transparent dark:from-[#0F0F12]"
      />
    </div>
  );
}

export const stickyFirstTh =
  "sticky left-0 z-10 bg-white py-2 pr-3 dark:bg-[#0F0F12]";
export const stickyFirstTd =
  "sticky left-0 z-10 bg-white py-2 pr-3 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)] dark:bg-[#0F0F12]";
