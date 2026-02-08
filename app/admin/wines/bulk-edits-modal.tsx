"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

export function BulkEditsModal({
  initialMargin,
  isMixed,
  initialB2BMargin,
  isB2BMixed,
  filteredWineIds,
  hasActiveFilters,
}: {
  initialMargin: number | null;
  isMixed: boolean;
  initialB2BMargin: number | null;
  isB2BMixed: boolean;
  filteredWineIds: string[];
  hasActiveFilters: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [margin, setMargin] = useState<string>(
    initialMargin === null ? "" : String(initialMargin),
  );
  const [b2bMargin, setB2bMargin] = useState<string>(
    initialB2BMargin === null ? "" : String(initialB2BMargin),
  );
  const [loading, setLoading] = useState(false);
  const [b2bLoading, setB2bLoading] = useState(false);

  useEffect(() => {
    setMargin(initialMargin === null ? "" : String(initialMargin));
  }, [initialMargin]);

  useEffect(() => {
    setB2bMargin(initialB2BMargin === null ? "" : String(initialB2BMargin));
  }, [initialB2BMargin]);

  const wineLabel =
    hasActiveFilters
      ? `${filteredWineIds.length} filtered wine${filteredWineIds.length !== 1 ? "s" : ""}`
      : "all wines";

  const runB2C = async () => {
    const parsed = Number(margin);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 100) {
      toast.error("B2C margin must be between 0 and 99.9");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/wines/bulk-margin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          margin_percentage: parsed,
          wine_ids: hasActiveFilters ? filteredWineIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Bulk update failed");

      toast.success("B2C margins updated", {
        description: `Updated: ${data.updated}, Skipped: ${data.skipped}, Failed: ${data.failed}`,
      });

      window.location.reload();
    } catch (e) {
      toast.error("Failed to update B2C margins", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const runB2B = async () => {
    const parsed = b2bMargin.trim() === "" ? null : Number(b2bMargin);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed >= 100)) {
      toast.error("B2B margin must be between 0 and 99.9, or leave empty to clear");
      return;
    }

    setB2bLoading(true);
    try {
      const res = await fetch("/api/admin/wines/bulk-margin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          b2b_margin_percentage: parsed,
          wine_ids: hasActiveFilters ? filteredWineIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Bulk update failed");

      toast.success(parsed === null ? "B2B margins cleared" : "B2B margins updated", {
        description: `Updated: ${data.updated}, Skipped: ${data.skipped}, Failed: ${data.failed}`,
      });

      window.location.reload();
    } catch (e) {
      toast.error("Failed to update B2B margins", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setB2bLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Bulk edits
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk edits</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          {/* B2C margin */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">B2C margin</h3>
            <p className="text-xs text-muted-foreground">
              Sets margin_percentage for {wineLabel} and recalculates B2C price
              (base_price) for wines with a cost amount.
            </p>
            <div className="flex items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="bulk_margin">Margin %</Label>
                <Input
                  id="bulk_margin"
                  type="number"
                  step="0.1"
                  min={0}
                  max={99.9}
                  className="no-spinner w-32"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  placeholder={isMixed ? "Mixed" : undefined}
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={loading || margin.trim() === ""}>
                    Apply B2C
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Update B2C margin for {wineLabel}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will set margin to {margin}% and recalculate pricing
                      for {wineLabel} with a cost amount. Cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={loading}
                      onClick={(e) => {
                        e.preventDefault();
                        runB2C();
                      }}
                    >
                      {loading ? "Updating..." : "Confirm"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* B2B margin */}
          <div className="space-y-3 border-t pt-6">
            <h3 className="text-sm font-medium">B2B margin</h3>
            <p className="text-xs text-muted-foreground">
              Sets b2b_margin_percentage for {wineLabel}. Leave empty to clear B2B
              margin (B2B price will then use B2C price exkl moms).
            </p>
            <div className="flex items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="bulk_b2b_margin">B2B margin %</Label>
                <Input
                  id="bulk_b2b_margin"
                  type="number"
                  step="0.5"
                  min={0}
                  max={99.9}
                  className="no-spinner w-32"
                  value={b2bMargin}
                  onChange={(e) => setB2bMargin(e.target.value)}
                  placeholder={isB2BMixed ? "Mixed" : "Optional"}
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={b2bLoading}>
                    {b2bMargin.trim() === "" ? "Clear B2B" : "Apply B2B"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {b2bMargin.trim() === ""
                        ? `Clear B2B margin for ${wineLabel}?`
                        : `Set B2B margin to ${b2bMargin}% for ${wineLabel}?`}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {b2bMargin.trim() === ""
                        ? `This will remove b2b_margin_percentage for ${wineLabel}. B2B price will use B2C price exkl moms.`
                        : `This will set B2B margin to ${b2bMargin}% for ${wineLabel}. B2B price will be calculated from cost + alcohol tax.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={b2bLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={b2bLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        runB2B();
                      }}
                    >
                      {b2bLoading ? "Updating..." : "Confirm"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
