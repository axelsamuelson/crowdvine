"use client";

import { useEffect, useState } from "react";

type DiscountTier = 0 | 10 | 20;

type ZoneStatusPayload = {
  bottlesFilled: number;
  bottleCapacity: number;
  fillPercent: number;
  discountTier: DiscountTier;
  estimatedDays: number | null;
  userZoneName: string;
  settingsUrl: string;
};

function isDiscountTier(n: number): n is DiscountTier {
  return n === 0 || n === 10 || n === 20;
}

function parseZoneStatusPayload(raw: unknown): ZoneStatusPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const bottlesFilled = Number(o.bottlesFilled);
  const bottleCapacity = Number(o.bottleCapacity);
  const fillPercent = Number(o.fillPercent);
  const discountTierNum = Number(o.discountTier);
  const userZoneName = o.userZoneName;
  const settingsUrl = o.settingsUrl;

  if (
    !Number.isFinite(bottlesFilled) ||
    !Number.isFinite(bottleCapacity) ||
    !Number.isFinite(fillPercent) ||
    !Number.isFinite(discountTierNum) ||
    !isDiscountTier(discountTierNum) ||
    typeof userZoneName !== "string" ||
    typeof settingsUrl !== "string"
  ) {
    return null;
  }

  let estimatedDays: number | null = null;
  if (o.estimatedDays !== null && o.estimatedDays !== undefined) {
    const ed = Number(o.estimatedDays);
    if (!Number.isFinite(ed)) return null;
    estimatedDays = ed;
  }

  return {
    bottlesFilled,
    bottleCapacity,
    fillPercent,
    discountTier: discountTierNum,
    estimatedDays,
    userZoneName,
    settingsUrl,
  };
}

export interface PalletStatusBarProps {
  productHandle: string;
}

export function PalletStatusBar({ productHandle }: PalletStatusBarProps) {
  const [data, setData] = useState<ZoneStatusPayload | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    function isAbortLike(e: unknown): boolean {
      if (cancelled) return true;
      if (e instanceof DOMException && e.name === "AbortError") return true;
      if (e instanceof Error && e.name === "AbortError") return true;
      return false;
    }

    async function load() {
      const handle = productHandle.trim();
      if (!handle) {
        if (!cancelled) {
          setPhase("error");
          setData(null);
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/pallet/zone-status?productHandle=${encodeURIComponent(handle)}`,
          { method: "GET", cache: "no-store", signal: ac.signal },
        );
        const json: unknown = await res.json();
        const parsed = parseZoneStatusPayload(json);
        if (cancelled) return;

        if (!parsed) {
          setPhase((p) => (p === "loading" ? "error" : p));
          return;
        }
        setData(parsed);
        setPhase("ready");
      } catch (e) {
        if (isAbortLike(e)) return;
        if (!cancelled) {
          setPhase((p) => (p === "loading" ? "error" : p));
        }
      }
    }

    void load();
    const id = window.setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(id);
    };
  }, [productHandle]);

  const isInitialFetch = phase === "loading" && !data;
  const barPercent = data?.fillPercent ?? 0;

  return (
    <div className="w-full min-w-0 overflow-clip border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between gap-4 min-w-0">
        <p className="min-w-0 shrink text-sm font-medium text-foreground">
          Pallet status
          {data?.userZoneName?.trim()
            ? ` · ${data.userZoneName.trim()}`
            : null}
        </p>
        <div className="min-w-0 text-right">
          {data && data.discountTier > 0 ? (
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              Early bird · {data.discountTier}% off
            </span>
          ) : data &&
            data.discountTier === 0 &&
            data.estimatedDays !== null ? (
            <p className="text-sm text-muted-foreground">
              Delivery in about {data.estimatedDays} days
            </p>
          ) : null}
        </div>
      </div>

      <div className="w-full rounded-full h-3 overflow-hidden flex bg-muted/50">
        <div
          className="h-full min-w-[2px] bg-foreground rounded-full transition-all duration-300"
          style={{ width: `${barPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-4 min-w-0">
        <p className="min-w-0 text-sm text-muted-foreground">
          {isInitialFetch
            ? "Loading pallet status..."
            : !data
              ? "Could not load pallet status."
              : `${data.bottlesFilled} of ${data.bottleCapacity} bottles ordered`}
        </p>
        {!isInitialFetch ? (
          <a
            href={data?.settingsUrl ?? "/profile/edit"}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Change zone
          </a>
        ) : null}
      </div>
    </div>
  );
}
