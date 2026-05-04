"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWineZoneSwitcher } from "@/lib/hooks/use-wine-zone-switcher";
import {
  normalizeUserReservationsResponse,
  type ReservationSummaryGroup,
} from "@/lib/reservations/user-reservations-api";

const FLAG_BY_CC: Record<string, string> = {
  US: "🇺🇸",
  SE: "🇸🇪",
  GB: "🇬🇧",
  DK: "🇩🇰",
  FI: "🇫🇮",
  NO: "🇳🇴",
  DE: "🇩🇪",
  FR: "🇫🇷",
};

function flagEmoji(countryCode: string): string {
  return FLAG_BY_CC[countryCode.trim().toUpperCase()] ?? "🌐";
}

export const WINE_ZONE_SETTINGS_PATH = "/settings/zone";

export interface HeaderShoppingContextProps {
  className?: string;
}

function useHeaderShoppingZone() {
  return useWineZoneSwitcher({ includeEligibleZones: false });
}

function compactCountryCode(
  signedIn: boolean | null,
  countryCode: string | undefined,
): string {
  if (signedIn === true && countryCode?.trim()) {
    return countryCode.trim().toUpperCase();
  }
  return "—";
}

function bottleLine(g: ReservationSummaryGroup): string {
  if (g.bottleVerb === "mixed") {
    return `${g.bottleCount} bottles`;
  }
  const verb = g.bottleVerb === "requested" ? "requested" : "ordered";
  return `${g.bottleCount} bottles ${verb}`;
}

function modeLine(g: ReservationSummaryGroup): string {
  if (g.bottleVerb === "mixed")
    return `${g.statusSummary} · Includes conditional and standard reservations`;
  if (g.isConditional) return "Conditional reservation";
  return g.statusSummary;
}

export function HeaderShoppingContext({
  className,
}: HeaderShoppingContextProps) {
  const [open, setOpen] = useState(false);
  const { signedIn, loading, activeZone } = useHeaderShoppingZone();
  const [summaryGroups, setSummaryGroups] = useState<ReservationSummaryGroup[]>(
    [],
  );
  const [reservationTotal, setReservationTotal] = useState(0);

  useEffect(() => {
    if (signedIn !== true) {
      setSummaryGroups([]);
      setReservationTotal(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/reservations", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json: unknown = await res.json();
        const { reservations, summaryGroups: groups } =
          normalizeUserReservationsResponse(json);
        if (cancelled) return;
        setSummaryGroups(groups.slice(0, 8));
        setReservationTotal(reservations.length);
      } catch {
        if (!cancelled) {
          setSummaryGroups([]);
          setReservationTotal(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const currency =
    activeZone?.currencyCode?.trim().toUpperCase() || "SEK";
  const displayFull = activeZone?.displayName?.trim() || "";
  const ccRaw = activeZone?.countryCode?.trim().toUpperCase() ?? "";
  const ccLabel = compactCountryCode(signedIn, ccRaw);
  const countSuffix =
    signedIn === true && reservationTotal > 0
      ? ` · ${reservationTotal}`
      : "";

  if (loading && signedIn === null) {
    return (
      <div className={cn("hidden md:flex items-center", className)}>
        <Skeleton className="h-8 w-[6.5rem] rounded-md" />
      </div>
    );
  }

  return (
    <div className={cn("hidden md:flex items-center shrink-0", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1.5 px-2 font-normal tabular-nums",
              "border-border/80 bg-background/80 text-xs md:text-sm",
            )}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`Shopping context: ${ccLabel}, currency ${currency}`}
          >
            <span className="text-base leading-none" aria-hidden>
              {flagEmoji(ccRaw)}
            </span>
            <span className="shrink-0 font-medium">{ccLabel}</span>
            <span className="text-muted-foreground">·</span>
            <span className="shrink-0 text-muted-foreground">{currency}</span>
            {countSuffix ? (
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {countSuffix}
              </span>
            ) : null}
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(100vw-1.5rem,22rem)] p-0"
          sideOffset={8}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Shopping in
            </p>
            {signedIn === true && displayFull ? (
              <p className="text-sm font-medium text-foreground leading-snug">
                {displayFull}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-snug">
                Sign in to see your wine zone details.
              </p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Currency</p>
                <p className="font-medium text-foreground">{currency}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Language</p>
                <p className="font-medium text-foreground">English</p>
                <p className="text-[10px] text-muted-foreground">Svenska — soon</p>
              </div>
            </div>
          </div>

          <div className="border-b border-border px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Reservations
            </p>
            {signedIn !== true ? (
              <p className="text-xs text-muted-foreground">Sign in to see reservations.</p>
            ) : summaryGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No reservations yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {summaryGroups.slice(0, 3).map((g) => (
                  <li key={g.groupKey} className="text-xs leading-snug">
                    <p className="font-medium text-foreground">{g.displayTitle}</p>
                    <p className="text-muted-foreground">{bottleLine(g)}</p>
                    <p className="text-muted-foreground">{modeLine(g)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5 px-3 py-2.5 border-b border-border/60">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link
                href="/profile/reservations"
                prefetch={false}
                onClick={() => setOpen(false)}
              >
                View all reservations
              </Link>
            </Button>
            <Button variant="default" size="sm" className="w-full" asChild>
              <Link
                href={WINE_ZONE_SETTINGS_PATH}
                prefetch={false}
                onClick={() => setOpen(false)}
              >
                Change zone
              </Link>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function HeaderShoppingContextMobile({
  className,
  onNavigate,
}: HeaderShoppingContextProps & { onNavigate?: () => void }) {
  const { signedIn, loading, activeZone } = useHeaderShoppingZone();
  const [reservationTotal, setReservationTotal] = useState(0);

  useEffect(() => {
    if (signedIn !== true) {
      setReservationTotal(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/reservations", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json: unknown = await res.json();
        const { reservations } = normalizeUserReservationsResponse(json);
        if (!cancelled) setReservationTotal(reservations.length);
      } catch {
        if (!cancelled) setReservationTotal(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const currency =
    activeZone?.currencyCode?.trim().toUpperCase() || "SEK";
  const ccRaw = activeZone?.countryCode?.trim().toUpperCase() ?? "";
  const ccLabel = compactCountryCode(signedIn, ccRaw);

  if (loading && signedIn === null) {
    return (
      <div className={cn("pl-2 mb-4", className)}>
        <Skeleton className="h-14 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className={cn("pl-2 mb-4 space-y-2", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Shopping context
      </p>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/80 bg-background/50 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium tabular-nums min-w-0">
          <span className="text-lg leading-none shrink-0" aria-hidden>
            {flagEmoji(ccRaw)}
          </span>
          <span className="truncate">
            {ccLabel} · {currency}
            {signedIn === true && reservationTotal > 0
              ? ` · ${reservationTotal}`
              : ""}
          </span>
        </span>
        <div className="flex flex-wrap gap-2 ml-auto shrink-0">
          <Link
            href={WINE_ZONE_SETTINGS_PATH}
            prefetch={false}
            onClick={onNavigate}
            className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            Zone
          </Link>
          <Link
            href="/profile/reservations"
            prefetch={false}
            onClick={onNavigate}
            className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            Reservations
          </Link>
        </div>
      </div>
    </div>
  );
}
