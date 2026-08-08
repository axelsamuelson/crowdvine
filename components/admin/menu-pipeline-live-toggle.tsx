"use client";

import { useEffect, useState, useTransition } from "react";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  getMenuPipelinePausedAction,
  setMenuPipelinePausedAction,
} from "@/lib/actions/menu-pipeline-pause";

/**
 * Live / Pause control for automated menu pipeline (all crons + alert mail/webhooks).
 * Manual admin actions on this page still work when paused.
 */
export function MenuPipelineLiveToggle() {
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getMenuPipelinePausedAction()
      .then((value) => {
        if (!cancelled) {
          setPaused(value);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded(true);
          toast.error("Kunde inte läsa pipeline-status");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function persist(nextPaused: boolean) {
    const prev = paused;
    setPaused(nextPaused);
    startTransition(async () => {
      try {
        await setMenuPipelinePausedAction(nextPaused);
        toast.success(
          nextPaused
            ? "Pipeline pausad — cron och mail stoppade"
            : "Pipeline live — cron och mail aktiva",
        );
      } catch {
        setPaused(prev);
        toast.error("Kunde inte spara pipeline-status");
      }
    });
  }

  const live = !paused;

  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-sm",
        live
          ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30"
          : "border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "shrink-0 rounded-lg p-2",
              live
                ? "bg-emerald-100 dark:bg-emerald-900/50"
                : "bg-amber-100 dark:bg-amber-900/50",
            )}
          >
            {live ? (
              <Play className="h-5 w-5 text-emerald-800 dark:text-emerald-200" />
            ) : (
              <Pause className="h-5 w-5 text-amber-800 dark:text-amber-200" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
              Pipeline: {loaded ? (live ? "Live" : "Pause") : "…"}
            </h2>
            <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5">
              {live
                ? "Cron, crawl, extraktion och alert-mail körs som vanligt."
                : "Allt automatiskt är pausat (cron, mail, webhooks). Manuell körning i admin fungerar fortfarande."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Label
            htmlFor="menu-pipeline-live"
            className={cn(
              "text-sm font-medium",
              !live && "text-gray-400 dark:text-zinc-500",
            )}
          >
            Live
          </Label>
          <Switch
            id="menu-pipeline-live"
            checked={live}
            disabled={!loaded || pending}
            onCheckedChange={(checked) => persist(!checked)}
            aria-label={live ? "Pipeline live" : "Pipeline pausad"}
          />
          <Label
            htmlFor="menu-pipeline-live"
            className={cn(
              "text-sm font-medium",
              live && "text-gray-400 dark:text-zinc-500",
            )}
          >
            Pause
          </Label>
        </div>
      </div>
    </div>
  );
}
