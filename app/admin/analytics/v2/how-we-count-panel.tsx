"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";

const BULLETS = [
  "Besök = en flik i webbläsaren (inte 30 minuter).",
  "Lade i varukorg = besök där någon lade till vin.",
  "Började i kassan = besök som öppnade kassan.",
  "Tratten är öppen som standard: man kan gå direkt till kassan utan att passera varukorgen (till exempel med den fasta köpknappen).",
  "Stängd tratt räknar bara besök som gått genom varje steg i ordning.",
  "Kassastegen är: postnummer → leverans → ålder och villkor → betalning.",
  "Köpvärde = vin efter rabatt plus frakt. Aldrig orderns totalsumma-fält.",
  "Bottfilter tar bort kända botar och förhandsladdningar innan siffrorna visas.",
];

export function HowWeCountButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-[#1F1F23] dark:text-gray-300 dark:hover:bg-zinc-900"
        aria-label="Så räknas det"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <HelpCircle className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-labelledby="analytics-how-count-title"
          className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-[#1F1F23] dark:bg-[#0F0F12]"
        >
          <div className="flex items-start justify-between gap-3">
            <p
              id="analytics-how-count-title"
              className="text-sm font-semibold text-gray-900 dark:text-white"
            >
              Så räknas det
            </p>
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
              aria-label="Stäng"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-gray-700 dark:text-zinc-300">
            {BULLETS.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
