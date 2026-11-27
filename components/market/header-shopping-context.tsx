"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  countryLabel,
  SEEDED_COUNTRIES,
} from "@/lib/market/country-registry";
import { alternateLanguagePath } from "@/lib/i18n/localized-paths";
import {
  readGeoCountryCookie,
  readShipToCookie,
} from "@/lib/market/ship-to-client";
import { cn } from "@/lib/utils";

export const WINE_ZONE_SETTINGS_PATH = "/settings/zone";

export type ShoppingContextMenuVariant = "header" | "footer";

export interface HeaderShoppingContextProps {
  className?: string;
  variant?: ShoppingContextMenuVariant;
}

function ZoneTriggerLabel({
  label,
  isFooter,
  showCurrency,
  currency,
  languageLabel,
}: {
  label: string;
  isFooter: boolean;
  showCurrency?: boolean;
  currency?: string;
  languageLabel?: string;
}) {
  const suffixClass = isFooter
    ? "text-background/50"
    : "text-muted-foreground tabular-nums";

  return (
    <>
      <Globe
        className={cn("shrink-0", isFooter ? "h-4 w-4" : "h-3.5 w-3.5")}
        strokeWidth={1.5}
        aria-hidden
      />
      <span>{label}</span>
      {showCurrency && currency ? (
        <span className={suffixClass}>· {currency}</span>
      ) : null}
      {languageLabel ? (
        <span className={suffixClass}>· {languageLabel}</span>
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
  const [ready, setReady] = useState(false);
  const { context: shopping, t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const appLocale = shopping.locale;
  const localeOptions = shopping.availableLocales;
  const activeLanguageLabel =
    appLocale === "en" ? t("shopping.english") : t("shopping.swedish");

  useEffect(() => {
    setReady(true);
  }, []);

  const triggerClass = cn(
    "inline-flex shrink-0 items-center gap-2 transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    isFooter
      ? "text-sm text-background/70 hover:text-background focus-visible:ring-background/40"
      : "hidden md:inline-flex h-8 rounded-full border border-border/80 bg-background/80 px-3 text-xs font-normal text-foreground hover:bg-muted/50 md:text-sm focus-visible:ring-foreground/20",
    className,
  );

  const trigger = (
    <button
      type="button"
      className={triggerClass}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={t("shopping.ariaContext", {
        country: label,
        currency: currency ?? shopping.currencyCode,
        language: activeLanguageLabel,
      })}
    >
      <ZoneTriggerLabel
        label={label}
        isFooter={isFooter}
        showCurrency={showCurrency}
        currency={currency}
        languageLabel={isFooter ? activeLanguageLabel : undefined}
      />
    </button>
  );

  if (!ready) return trigger;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        side={isFooter ? "top" : "bottom"}
        sideOffset={10}
        className="w-[min(100vw-1.5rem,15rem)] rounded-2xl border-0 bg-popover p-4 shadow-xl ring-1 ring-border/40"
      >
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Ship to</p>
            <div className="flex flex-wrap gap-1">
              {SEEDED_COUNTRIES.map((country) => (
                <button
                  key={country.countryCode}
                  type="button"
                  className="rounded-full border border-border px-2 py-0.5 text-xs"
                  onClick={() => {
                    setOpen(false);
                    void fetch("/api/ship-to", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ countryCode: country.countryCode }),
                    }).then(() => window.location.reload());
                  }}
                >
                  {countryLabel(country.countryCode, appLocale === "en" ? "en" : "sv")}
                </button>
              ))}
            </div>
          </div>
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
                        setOpen(false);
                        router.push(alternateLanguagePath(pathname || "/", loc));
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

export function HeaderShoppingContext({
  className,
  variant = "header",
}: HeaderShoppingContextProps) {
  const isFooter = variant === "footer";
  const { context: shopping } = useTranslations();
  const uiLocale = shopping.locale === "sv" ? "sv" : "en";
  const [ship, setShip] = useState<string | null>(null);
  const [geo, setGeo] = useState<string | null>(null);

  useEffect(() => {
    setShip(readShipToCookie());
    setGeo(readGeoCountryCookie());
  }, []);

  const code = ship ?? geo ?? "SE";
  const label = `Ship to ${countryLabel(code, uiLocale)}`;
  const suggest = !ship && Boolean(geo) && geo !== "SE";

  function choose(countryCode: string) {
    void fetch("/api/ship-to", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode }),
    }).then(() => window.location.reload());
  }

  return (
    <div className="inline-flex items-center gap-2">
      {suggest && geo ? (
        <div className="hidden items-center gap-1 text-xs md:flex">
          <span>Ship to {countryLabel(geo, uiLocale)}?</span>
          <button type="button" className="underline" onClick={() => choose(geo)}>
            {countryLabel(geo, uiLocale)}
          </button>
          <button type="button" className="underline" onClick={() => choose("SE")}>
            {countryLabel("SE", uiLocale)}
          </button>
        </div>
      ) : null}
      <SwedenZonePopover
        isFooter={isFooter}
        label={label}
        className={className}
        showCurrency={!isFooter}
        currency={shopping.currencyCode}
      />
    </div>
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
  const { context: shopping } = useTranslations();
  const uiLocale = shopping.locale === "sv" ? "sv" : "en";
  const [ship, setShip] = useState<string | null>(null);
  const [geo, setGeo] = useState<string | null>(null);
  useEffect(() => {
    setShip(readShipToCookie());
    setGeo(readGeoCountryCookie());
  }, []);
  const label = `Ship to ${countryLabel(ship ?? geo ?? "SE", uiLocale)}`;

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
