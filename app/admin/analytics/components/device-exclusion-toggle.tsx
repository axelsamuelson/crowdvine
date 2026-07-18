"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  isInternalDevice,
  setInternalDevice,
} from "@/lib/analytics/internal-device";

export function DeviceExclusionToggle() {
  const [excluded, setExcluded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setExcluded(isInternalDevice());
    setReady(true);
  }, []);

  const onCheckedChange = (checked: boolean) => {
    setInternalDevice(checked);
    setExcluded(checked);
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-[#1F1F23]">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Enhetsexkludering
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
          Markerar events från den här webbläsaren som interna. De sparas
          fortfarande i rådata men exkluderas från Trafik och andra rena
          metrics.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="space-y-1 min-w-0">
          <Label
            htmlFor="device-exclusion"
            className="text-sm font-medium text-gray-900 dark:text-white"
          >
            Exkludera denna enhet från analytics
          </Label>
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            {ready && excluded
              ? "Denna enhet exkluderas från trafikdata"
              : ready
                ? "Denna enhet ingår i trafikdata"
                : "…"}
          </p>
        </div>
        <Switch
          id="device-exclusion"
          checked={excluded}
          onCheckedChange={onCheckedChange}
          disabled={!ready}
          aria-label="Exkludera denna enhet från analytics"
        />
      </div>
    </section>
  );
}
