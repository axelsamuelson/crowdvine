"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, Wine } from "lucide-react";
import WineForm, {
  type WineSaveStatus,
} from "@/components/admin/wine-form";
import { DeleteWineButton } from "@/components/admin/delete-wine-button";
import { Button } from "@/components/ui/button";
import {
  ADMIN_OUTLINE_BUTTON_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from "@/lib/admin-form-styles";
import { cn } from "@/lib/utils";
import type { Wine } from "@/lib/actions/wines";
import type { Producer } from "@/lib/actions/producers";

type WineEditPageClientProps = {
  wine: Wine;
  producers: Producer[];
  afterProductDropdowns?: ReactNode;
};

export function WineEditPageClient({
  wine,
  producers,
  afterProductDropdowns,
}: WineEditPageClientProps) {
  const [saveStatus, setSaveStatus] = useState<WineSaveStatus>("idle");

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timer = window.setTimeout(() => setSaveStatus("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  const saveLabel =
    saveStatus === "saving"
      ? "Sparar…"
      : saveStatus === "saved"
        ? "Sparat"
        : "Spara vin";

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0F0F12]/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-100 p-2 dark:bg-zinc-800">
            <Wine className="h-5 w-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {wine.wine_name} {wine.vintage}
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              {saveStatus === "saving"
                ? "Sparar ändringar…"
                : saveStatus === "saved"
                  ? "Ändringarna är sparade"
                  : "Redigera vin — fälten motsvarar produktsidan (PDP)"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {wine.handle ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "text-xs font-medium")}
            >
              <Link href={`/product/${wine.handle}`} target="_blank">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Visa PDP
              </Link>
            </Button>
          ) : null}
          <Button
            form="wine-edit-form"
            type="submit"
            size="sm"
            disabled={saveStatus === "saving"}
            className={cn(
              ADMIN_PRIMARY_BUTTON_CLASS,
              "text-xs font-medium min-w-[7.5rem]",
              saveStatus === "saved" &&
                "bg-emerald-600 hover:bg-emerald-600 text-white",
            )}
          >
            {saveStatus === "saving" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : saveStatus === "saved" ? (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            ) : null}
            {saveLabel}
          </Button>
          <DeleteWineButton wineId={wine.id} wineName={wine.wine_name} />
        </div>
      </div>

      <WineForm
        wine={wine}
        producers={producers}
        afterProductDropdowns={afterProductDropdowns}
        onSaveStatusChange={setSaveStatus}
      />
    </div>
  );
}
