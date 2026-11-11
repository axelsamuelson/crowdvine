"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, Wine } from "lucide-react";
import WineForm, {
  type WineSaveStatus,
} from "@/components/admin/wine-form";
import { DeleteWineButton } from "@/components/admin/delete-wine-button";
import { Button } from "@/components/ui/button";
import { ADMIN_OUTLINE_BUTTON_CLASS } from "@/lib/admin-form-styles";
import { cn } from "@/lib/utils";
import type { Wine } from "@/lib/actions/wines";
import type { Producer } from "@/lib/actions/producers";

const ADMIN_PRIMARY_DUAL =
  "rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

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

  const wineTitle = `${wine.wine_name} ${wine.vintage}`.trim();

  const saveButton = (
    <Button
      form="wine-edit-form"
      type="submit"
      size="sm"
      disabled={saveStatus === "saving"}
      className={cn(
        ADMIN_PRIMARY_DUAL,
        "min-w-[7.5rem] shrink-0",
        saveStatus === "saved" &&
          "bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-600",
      )}
    >
      {saveStatus === "saving" ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : saveStatus === "saved" ? (
        <Check className="mr-1.5 h-3.5 w-3.5" />
      ) : null}
      {saveLabel}
    </Button>
  );

  const producerLine =
    wine.producer?.name != null && wine.producer.name !== "" ? (
      wine.producer_id ? (
        <Link
          href={`/admin/producers/${wine.producer_id}`}
          className="text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {wine.producer.name}
        </Link>
      ) : (
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          {wine.producer.name}
        </p>
      )
    ) : null;

  const statusLine = (
    <p className="text-sm text-gray-600 dark:text-zinc-400">
      {saveStatus === "saving"
        ? "Sparar ändringar…"
        : saveStatus === "saved"
          ? "Ändringarna är sparade"
          : "Redigera vin — fälten motsvarar produktsidan (PDP)"}
    </p>
  );

  const secondaryActions = (
    <>
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
      <DeleteWineButton wineId={wine.id} wineName={wine.wine_name} />
    </>
  );

  return (
    <div>
      {/* Mobile: full header scrolls away (Visa PDP / Ta bort live here). */}
      <div className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-[#1F1F23] dark:bg-[#0F0F12] md:hidden">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-gray-100 p-2 dark:bg-zinc-800">
            <Wine className="h-5 w-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {wineTitle}
            </h1>
            {producerLine}
            {statusLine}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">{secondaryActions}</div>
      </div>

      {/*
        Mobile compact sticky: pull into the admin main's pt-4/pt-6 so nothing
        shows through above the bar; opaque white / zinc-950; ~56px control row.
      */}
      <div className="sticky -top-4 z-10 -mx-3 mt-0 border-b border-gray-200 bg-white px-3 pt-4 dark:border-zinc-800 dark:bg-zinc-950 sm:-mx-6 sm:-top-6 sm:px-6 sm:pt-6 md:hidden">
        <div className="flex h-14 items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
            {wineTitle}
          </p>
          {saveButton}
        </div>
      </div>

      {/* Desktop: opaque sticky full header; extend into main pt so no gap. */}
      <div className="sticky -top-4 z-10 mb-6 hidden bg-white pt-4 dark:bg-[#0F0F12] sm:-top-6 sm:pt-6 md:block">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2 dark:bg-zinc-800">
              <Wine className="h-5 w-5 text-gray-900 dark:text-zinc-50" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {wineTitle}
              </h1>
              {producerLine}
              {statusLine}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {secondaryActions}
            {saveButton}
          </div>
        </div>
      </div>

      <div className="mt-6 md:mt-0">
        <WineForm
          wine={wine}
          producers={producers}
          afterProductDropdowns={afterProductDropdowns}
          onSaveStatusChange={setSaveStatus}
        />
      </div>
    </div>
  );
}
