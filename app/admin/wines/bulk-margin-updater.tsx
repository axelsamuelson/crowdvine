"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function BulkMarginUpdater({
  initialMargin,
  isMixed,
}: {
  initialMargin: number | null;
  isMixed: boolean;
}) {
  const [margin, setMargin] = useState<string>(
    initialMargin === null ? "" : String(initialMargin),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMargin(initialMargin === null ? "" : String(initialMargin));
  }, [initialMargin]);

  const run = async () => {
    const parsed = Number(margin);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 100) {
      toast.error("Margin must be between 0 and 99.9");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/wines/bulk-margin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ margin_percentage: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Bulk update failed");

      toast.success("Margins updated", {
        description: `Updated: ${data.updated}, Skipped: ${data.skipped}, Failed: ${data.failed}`,
      });

      // Refresh server component data
      window.location.reload();
    } catch (e) {
      toast.error("Failed to update margins", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk margin update</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Sets <span className="font-medium">margin_percentage</span> for all
          wines and recalculates price (base + calculated) for wines with a cost
          amount.
        </p>

        <div className="flex items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="bulk_margin">Margin %</Label>
            <Input
              id="bulk_margin"
              type="number"
              step="0.1"
              className="no-spinner w-40"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              placeholder={isMixed ? "Mixed values" : undefined}
            />
            {isMixed && margin === "" && (
              <div className="text-xs text-gray-500">Mixed values</div>
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={loading || margin.trim() === ""}>
                Apply to all wines
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Update margin for all wines?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will update margin and recalculate pricing for all wines
                  with a cost amount. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={loading}
                  onClick={(e) => {
                    e.preventDefault();
                    run();
                  }}
                >
                  {loading ? "Updating..." : "Confirm"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

