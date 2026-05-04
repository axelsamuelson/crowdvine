"use client";

import { useEffect, useState } from "react";
import { ZoneContextSwitcher } from "@/components/market/zone-context-switcher";

type DiscountTier = 0 | 10 | 20;

type DropState = "existing" | "virtual_available" | "unavailable";

type ZoneStatusPayload = {
  bottlesFilled: number;
  bottleCapacity: number;
  fillPercent: number;
  discountTier: DiscountTier;
  estimatedDays: number | null;
  userZoneName: string;
  settingsUrl: string;
  /** First segment before " · " (e.g. Pallet status, Conditional drop). */
  statusPrimary: string;
  /** "ordered" (EU) vs "requested" (US conditional). */
  bottlesVerb: "ordered" | "requested";
  logisticsFootnote: string | null;
  dropState: DropState;
  marketDropId: string | null;
  displayDestination: string;
  canStartMarketDrop: boolean;
  campaignTagline: string | null;
  showProgressBar: boolean;
  showEarlyBird: boolean;
  unavailableMessage: string | null;
};

function isDiscountTier(n: number): n is DiscountTier {
  return n === 0 || n === 10 || n === 20;
}

function parseDropState(raw: unknown): DropState {
  if (
    raw === "existing" ||
    raw === "virtual_available" ||
    raw === "unavailable"
  ) {
    return raw;
  }
  return "existing";
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
  const statusPrimaryRaw = o.statusPrimary;
  const bottlesVerbRaw = o.bottlesVerb;
  const footnoteRaw = o.logisticsFootnote;

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

  const statusPrimary =
    typeof statusPrimaryRaw === "string" && statusPrimaryRaw.trim()
      ? statusPrimaryRaw.trim()
      : "Pallet status";
  const bottlesVerb =
    bottlesVerbRaw === "requested" ? "requested" : "ordered";
  const logisticsFootnote =
    footnoteRaw === null || footnoteRaw === undefined
      ? null
      : typeof footnoteRaw === "string"
        ? footnoteRaw.trim() || null
        : null;

  let estimatedDays: number | null = null;
  if (o.estimatedDays !== null && o.estimatedDays !== undefined) {
    const ed = Number(o.estimatedDays);
    if (!Number.isFinite(ed)) return null;
    estimatedDays = ed;
  }

  const dropState = parseDropState(o.dropState);
  const marketDropId =
    typeof o.marketDropId === "string" && o.marketDropId.trim()
      ? o.marketDropId.trim()
      : null;
  const displayDestination =
    typeof o.displayDestination === "string" ? o.displayDestination : "";
  const canStartMarketDrop = o.canStartMarketDrop !== false;
  const campaignTagline =
    typeof o.campaignTagline === "string" && o.campaignTagline.trim()
      ? o.campaignTagline.trim()
      : null;
  const showProgressBar = o.showProgressBar !== false;
  const showEarlyBird = o.showEarlyBird !== false;
  const unavailableMessage =
    typeof o.unavailableMessage === "string" && o.unavailableMessage.trim()
      ? o.unavailableMessage.trim()
      : null;

  return {
    bottlesFilled,
    bottleCapacity,
    fillPercent,
    discountTier: discountTierNum,
    estimatedDays,
    userZoneName,
    settingsUrl,
    statusPrimary,
    bottlesVerb,
    logisticsFootnote,
    dropState,
    marketDropId,
    displayDestination,
    canStartMarketDrop,
    campaignTagline,
    showProgressBar,
    showEarlyBird,
    unavailableMessage,
  };
}

export interface PalletStatusBarProps {
  productHandle: string;
}

export function PalletStatusBar({ productHandle }: PalletStatusBarProps) {
  const [data, setData] = useState<ZoneStatusPayload | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [zoneEpoch, setZoneEpoch] = useState(0);

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
  }, [productHandle, zoneEpoch]);

  const isInitialFetch = phase === "loading" && !data;
  const barPercent = data?.fillPercent ?? 0;
  const isUnavailable = data?.dropState === "unavailable";
  const showBar = data?.showProgressBar !== false;
  const allowEarlyBird =
    !isUnavailable && data?.showEarlyBird !== false && (data?.discountTier ?? 0) > 0;
  const allowEta =
    !isUnavailable &&
    data?.showEarlyBird !== false &&
    data?.discountTier === 0 &&
    data?.estimatedDays !== null;

  return (
    <div className="w-full min-w-0 overflow-clip border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between gap-4 min-w-0">
        <p className="min-w-0 shrink text-sm font-medium text-foreground">
          {data?.statusPrimary ?? "Pallet status"}
          {!isUnavailable && data?.userZoneName?.trim()
            ? ` · ${data.userZoneName.trim()}`
            : null}
        </p>
        <div className="min-w-0 text-right">
          {data && allowEarlyBird ? (
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              Early bird · {data.discountTier}% off
            </span>
          ) : data && allowEta ? (
            <p className="text-sm text-muted-foreground">
              Delivery in about {data.estimatedDays} days
            </p>
          ) : null}
        </div>
      </div>

      {showBar ? (
        <div className="w-full rounded-full h-3 overflow-hidden flex bg-muted/50">
          <div
            className="h-full min-w-[2px] bg-foreground rounded-full transition-all duration-300"
            style={{ width: `${barPercent}%` }}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 min-w-0">
        <p className="min-w-0 text-sm text-muted-foreground">
          {isInitialFetch
            ? "Loading pallet status..."
            : !data
              ? "Could not load pallet status."
              : isUnavailable && data.unavailableMessage
                ? data.unavailableMessage
                : `${data.bottlesFilled} of ${data.bottleCapacity} bottles ${
                    data.bottlesVerb === "requested" ? "requested" : "ordered"
                  }`}
        </p>
        {!isInitialFetch && !isUnavailable ? (
          <a
            href={data?.settingsUrl ?? "/profile/edit"}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Delivery details
          </a>
        ) : null}
      </div>
      {data?.logisticsFootnote ? (
        <p className="text-xs text-muted-foreground">{data.logisticsFootnote}</p>
      ) : null}
      {data?.campaignTagline ? (
        <p className="text-xs text-muted-foreground">{data.campaignTagline}</p>
      ) : null}
    </div>
  );
}
