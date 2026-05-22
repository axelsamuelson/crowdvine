"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { getCountryDisplayName } from "@/lib/countries";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";
import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";
import { cn } from "@/lib/utils";

export const WINE_ZONE_SETTINGS_PATH = "/settings/zone";

export type ShoppingContextMenuVariant = "header" | "footer";

export interface HeaderShoppingContextProps {
  className?: string;
  variant?: ShoppingContextMenuVariant;
}

function isSwedenWineZone(
  zone: Pick<ResolvedActiveGeoZone, "countryCode">,
): boolean {
  return zone.countryCode?.trim().toUpperCase() === "SE";
}

function locationLabelFromZone(
  displayName: string,
  countryCode: string,
  locale: "en" | "sv",
  fallback: string,
): string {
  if (displayName) {
    const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  if (countryCode) return getCountryDisplayName(countryCode, locale);
  return fallback;
}

function ZoneTriggerLabel({
  label,
  isFooter,
  showCurrency,
  currency,
}: {
  label: string;
  isFooter: boolean;
  showCurrency?: boolean;
  currency?: string;
}) {
  return (
    <>
      <Globe
        className={cn("shrink-0", isFooter ? "h-4 w-4" : "h-3.5 w-3.5")}
        strokeWidth={1.5}
        aria-hidden
      />
      <span>{label}</span>
      {showCurrency && currency ? (
        <span className="text-muted-foreground tabular-nums">· {currency}</span>
      ) : null}
    </>
  );
}

function SwedenZonePopover({
  isFooter,
  label,
  className,
  showCurrency,
  currency,
}: {
  isFooter: boolean;
  label: string;
  className?: string;
  showCurrency?: boolean;
  currency?: string;
}) {
  const [open, setOpen] = useState(false);
  const { context: shopping, setLocale, t } = useShoppingContext();
  const appLocale = shopping.locale;
  const localeOptions = shopping.availableLocales;

  const triggerClass = cn(
    "inline-flex shrink-0 items-center gap-2 transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    isFooter
      ? "text-sm text-background/70 hover:text-background focus-visible:ring-background/40"
      : "hidden md:inline-flex h-8 rounded-full border border-border/80 bg-background/80 px-3 text-xs font-normal text-foreground hover:bg-muted/50 md:text-sm focus-visible:ring-foreground/20",
    className,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClass}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={t("shopping.ariaContext", {
            country: label,
            currency: currency ?? shopping.currencyCode,
          })}
        >
          <ZoneTriggerLabel
            label={label}
            isFooter={isFooter}
            showCurrency={showCurrency}
            currency={currency}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side={isFooter ? "top" : "bottom"}
        sideOffset={10}
        className="w-[min(100vw-1.5rem,15rem)] rounded-2xl border-0 bg-popover p-4 shadow-xl ring-1 ring-border/40"
      >
        <div className="space-y-3">
          {localeOptions.length > 1 ? (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                {t("shopping.language")}
              </p>
              <div
                className="flex items-center gap-1 text-sm"
                role="group"
                aria-label={t("shopping.language")}
              >
                {localeOptions.map((loc, i) => (
                  <span key={loc} className="inline-flex items-center gap-1">
                    {i > 0 ? (
                      <span className="text-muted-foreground/40" aria-hidden>
                        /
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        void setLocale(loc).catch(() => {});
                      }}
                      className={cn(
                        "transition-colors",
                        appLocale === loc
                          ? "font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {loc === "en"
                        ? t("shopping.english")
                        : t("shopping.swedish")}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <Link
            href={WINE_ZONE_SETTINGS_PATH}
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("shopping.changeZone")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ZoneNavLink({
  isFooter,
  label,
  className,
  showCurrency,
  currency,
}: {
  isFooter: boolean;
  label: string;
  className?: string;
  showCurrency?: boolean;
  currency?: string;
}) {
  const { t } = useShoppingContext();

  return (
    <Link
      href={WINE_ZONE_SETTINGS_PATH}
      prefetch={false}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isFooter
          ? "text-sm text-background/70 hover:text-background focus-visible:ring-background/40"
          : "hidden md:inline-flex h-8 rounded-full border border-border/80 bg-background/80 px-3 text-xs font-normal text-foreground hover:bg-muted/50 md:text-sm focus-visible:ring-foreground/20",
        className,
      )}
      aria-label={t("shopping.changeZone")}
    >
      <ZoneTriggerLabel
        label={label}
        isFooter={isFooter}
        showCurrency={showCurrency}
        currency={currency}
      />
    </Link>
  );
}

export function HeaderShoppingContext({
  className,
  variant = "header",
}: HeaderShoppingContextProps) {
  const isFooter = variant === "footer";
  const { context: shopping, t } = useShoppingContext();
  const uiLocale = shopping.locale === "sv" ? "sv" : "en";
  const zone = shopping.activeZone;
  const displayFull = zone.displayName?.trim() || "";
  const ccRaw = zone.countryCode?.trim().toUpperCase() ?? "";
  const label = locationLabelFromZone(
    displayFull,
    ccRaw,
    uiLocale,
    t("shopping.selectRegion"),
  );
  const sweden = isSwedenWineZone(zone);

  if (sweden) {
    return (
      <SwedenZonePopover
        isFooter={isFooter}
        label={label}
        className={className}
        showCurrency={!isFooter}
        currency={shopping.currencyCode}
      />
    );
  }

  return (
    <ZoneNavLink
      isFooter={isFooter}
      label={label}
      className={className}
      showCurrency={!isFooter}
      currency={shopping.currencyCode}
    />
  );
}

/** Localization control for the site footer (all breakpoints). */
export function FooterShoppingContext({
  className,
}: Pick<HeaderShoppingContextProps, "className">) {
  return <HeaderShoppingContext variant="footer" className={className} />;
}

export function HeaderShoppingContextMobile({
  className,
  onNavigate,
}: HeaderShoppingContextProps & { onNavigate?: () => void }) {
  const { context: shopping, t } = useShoppingContext();
  const uiLocale = shopping.locale === "sv" ? "sv" : "en";
  const zone = shopping.activeZone;
  const label = locationLabelFromZone(
    zone.displayName?.trim() || "",
    zone.countryCode?.trim().toUpperCase() ?? "",
    uiLocale,
    t("shopping.selectRegion"),
  );

  return (
    <Link
      href={WINE_ZONE_SETTINGS_PATH}
      prefetch={false}
      onClick={onNavigate}
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium text-foreground",
        className,
      )}
    >
      <Globe className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
