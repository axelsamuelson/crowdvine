"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createWineInternalRating,
} from "@/lib/actions/wine-ratings";
import type { WineInternalRating } from "@/lib/wine-internal-rating";
import { ADMIN_FORM_FIELDS_CLASS, ADMIN_HELP_TEXT_CLASS, ADMIN_PRIMARY_BUTTON_CLASS, ADMIN_FIELD_CLASS } from "@/lib/admin-form-styles";
import { cn } from "@/lib/utils";

const VERDICT_LABELS: Record<"buy" | "maybe" | "pass", string> = {
  buy: "Köp",
  maybe: "Kanske",
  pass: "Nej",
};

function todayIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(iso: string): string {
  const dateOnly = iso.slice(0, 10);
  const [y, m, d] = dateOnly.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("sv-SE");
}

type VerdictValue = "buy" | "maybe" | "pass" | "";

export function WineInternalRatingCard({
  wineId,
  ratings,
}: {
  wineId: string;
  ratings: WineInternalRating[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [score, setScore] = useState("");
  const [verdict, setVerdict] = useState<VerdictValue>("");
  const [notes, setNotes] = useState("");
  const [tastedAt, setTastedAt] = useState(todayIsoDate);

  const resetForm = () => {
    setScore("");
    setVerdict("");
    setNotes("");
    setTastedAt(todayIsoDate());
    setFormKey((k) => k + 1);
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const scoreNum =
      score.trim() === "" ? null : Number.parseInt(score, 10);
    if (score.trim() !== "" && (!Number.isFinite(scoreNum) || scoreNum == null)) {
      toast.error("Poäng måste vara ett heltal mellan 1 och 100");
      return;
    }

    startTransition(async () => {
      try {
        await createWineInternalRating({
          wine_id: wineId,
          score: scoreNum,
          verdict: verdict === "" ? null : verdict,
          notes: notes.trim() === "" ? null : notes,
          tasted_at: tastedAt,
        });
        toast.success("Betyg sparat");
        resetForm();
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Kunde inte spara betyg";
        toast.error(message);
      }
    });
  };

  return (
    <AdminFormSection
      title="Internt betyg"
      description="Interna poäng och omdömen — sparas separat från vinet."
    >
      {/* div (not form): rendered inside wine-edit-form; avoid nested forms */}
      <div
        key={formKey}
        className={`space-y-3 ${ADMIN_FORM_FIELDS_CLASS}`}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            e.target instanceof HTMLInputElement &&
            e.target.type !== "textarea"
          ) {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="wir-score">Poäng</Label>
          <Input
            id="wir-score"
            type="number"
            min={1}
            max={100}
            step={1}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="1–100"
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wir-verdict">Omdöme</Label>
          <Select
            value={verdict || undefined}
            onValueChange={(value) => setVerdict(value as VerdictValue)}
            disabled={isPending}
          >
            <SelectTrigger id="wir-verdict" className={cn("w-full", ADMIN_FIELD_CLASS)}>
              <SelectValue placeholder="Välj omdöme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">Köp</SelectItem>
              <SelectItem value="maybe">Kanske</SelectItem>
              <SelectItem value="pass">Nej</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wir-notes">Anteckning</Label>
          <Textarea
            id="wir-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wir-tasted-at">Provades</Label>
          <Input
            id="wir-tasted-at"
            type="date"
            value={tastedAt}
            onChange={(e) => setTastedAt(e.target.value)}
            required
            disabled={isPending}
          />
        </div>

        <p className={ADMIN_HELP_TEXT_CLASS}>
          Ange minst poäng eller omdöme.
        </p>

        <Button
          type="button"
          size="sm"
          disabled={isPending}
          className={cn("w-full", ADMIN_PRIMARY_BUTTON_CLASS)}
          onClick={handleSubmit}
        >
          {isPending ? "Sparar…" : "Spara betyg"}
        </Button>
      </div>

      <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
          Tidigare betyg
        </h3>
        {ratings.length === 0 ? (
          <p className={ADMIN_HELP_TEXT_CLASS}>
            Inga interna betyg ännu.
          </p>
        ) : (
          <ul className="space-y-3">
            {ratings.map((rating) => (
              <li
                key={rating.id}
                className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <span className="font-medium text-gray-900 dark:text-zinc-100">
                    {formatDisplayDate(rating.tasted_at)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    {rating.rater_email ?? "Okänd"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-gray-700 dark:text-zinc-300">
                  {rating.score != null ? (
                    <span className="tabular-nums">{rating.score}/100</span>
                  ) : null}
                  {rating.verdict ? (
                    <span>{VERDICT_LABELS[rating.verdict]}</span>
                  ) : null}
                </div>
                {rating.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-gray-600 dark:text-zinc-400">
                    {rating.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminFormSection>
  );
}
