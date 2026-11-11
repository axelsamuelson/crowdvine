"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Loader2, Wine } from "lucide-react";
import ProducerForm, {
  type ProducerSaveStatus,
} from "@/components/admin/producer-form";
import { DeleteProducerButton } from "@/components/admin/delete-producer-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Producer } from "@/lib/actions/producers";

const ADMIN_PRIMARY_DUAL =
  "rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

export function ProducerEditPageClient({
  producer,
  children,
}: {
  producer: Producer;
  children?: ReactNode;
}) {
  const [saveStatus, setSaveStatus] = useState<ProducerSaveStatus>("idle");

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
        : "Spara producent";

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white/90 px-4 py-3 backdrop-blur-sm dark:border-[#1F1F23] dark:bg-[#0F0F12]/90">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-100 p-2 dark:bg-zinc-800">
            <Wine className="h-5 w-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {producer.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              {saveStatus === "saving"
                ? "Sparar ändringar…"
                : saveStatus === "saved"
                  ? "Ändringarna är sparade"
                  : "Redigera producent"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={saveStatus === "saving"}
            onClick={() => {
              const form = document.getElementById("producer-edit-form");
              if (form instanceof HTMLFormElement) form.requestSubmit();
            }}
            className={cn(
              ADMIN_PRIMARY_DUAL,
              "min-w-[9.5rem]",
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
          <DeleteProducerButton
            producerId={producer.id}
            producerName={producer.name}
          />
        </div>
      </div>

      <ProducerForm producer={producer} onSaveStatusChange={setSaveStatus} />
      {children}
    </div>
  );
}
