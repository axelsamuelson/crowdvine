"use client";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onChoose: (strategy: "keep_session" | "keep_user" | "merge") => void;
  loading?: boolean;
};

export function CartMergeModal({ open, onChoose, loading }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Du har två varukorgar
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Vi hittade både din nuvarande varukorg och en sparad varukorg. Vad vill
          du behålla?
        </p>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onChoose("keep_session")}
          >
            Behåll min nuvarande varukorg
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onChoose("keep_user")}
          >
            Behåll min sparade varukorg
          </Button>
          <Button
            type="button"
            disabled={loading}
            className="bg-black text-white hover:bg-black/90"
            onClick={() => onChoose("merge")}
          >
            Slå ihop båda
          </Button>
        </div>
      </div>
    </div>
  );
}
