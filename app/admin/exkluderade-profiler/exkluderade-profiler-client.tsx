"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addMetricExcludedProfileByEmail,
  removeMetricExcludedProfile,
  type MetricsExcludedProfileRow,
} from "@/lib/actions/metrics-exclusions";

type Props = {
  initialRows: MetricsExcludedProfileRow[];
};

function reasonLabel(row: MetricsExcludedProfileRow): string {
  if (row.reason === "testkop" || row.source_discount_code) {
    return row.source_discount_code
      ? `Testköp — ${row.source_discount_code}`
      : "Testköp";
  }
  if (row.reason === "manuell" || !row.reason) {
    return "Manuell exkludering";
  }
  return row.reason;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("sv-SE");
  } catch {
    return iso;
  }
}

export function ExkluderadeProfilerClient({ initialRows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState(initialRows);
  const [email, setEmail] = useState("");
  const [removeTarget, setRemoveTarget] =
    useState<MetricsExcludedProfileRow | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const onAdd = () => {
    const value = email.trim();
    if (!value) {
      toast.error("Ange e-postadress");
      return;
    }
    start(async () => {
      try {
        await addMetricExcludedProfileByEmail(value);
        setEmail("");
        toast.success("Exkludering tillagd");
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Kunde inte lägga till");
      }
    });
  };

  const onConfirmRemove = () => {
    if (!removeTarget) return;
    const id = removeTarget.profile_id;
    start(async () => {
      try {
        await removeMetricExcludedProfile(id);
        setRemoveTarget(null);
        toast.success("Exkludering borttagen");
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Kunde inte ta bort");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="excl-email">Lägg till exkludering</Label>
            <Input
              id="excl-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anvandare@exempel.se"
            />
          </div>
          <Button type="button" onClick={onAdd} disabled={pending}>
            Lägg till exkludering
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">E-post</th>
              <th className="px-4 py-3 font-medium">Anledning</th>
              <th className="px-4 py-3 font-medium">Exkluderad sedan</th>
              <th className="px-4 py-3 font-medium">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Inga exkluderade profiler
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.profile_id}
                  className="border-b border-gray-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3 break-all">
                    {row.email ?? row.profile_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">{reasonLabel(row)}</td>
                  <td className="px-4 py-3 tabular-nums text-xs">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => setRemoveTarget(row)}
                    >
                      Ta bort exkludering
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Borttagning påverkar bara framtida data. Events som redan loggats med
        internal: true filtreras fortfarande bort.
      </p>

      <Dialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ta bort exkludering?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    {removeTarget?.email ?? "Kontot"}
                  </span>{" "}
                  kommer att inkluderas i analysdata igen. Tidigare events från
                  kontot som redan taggats internal: true förblir exkluderade.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveTarget(null)}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={onConfirmRemove}
            >
              Ta bort exkludering
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
