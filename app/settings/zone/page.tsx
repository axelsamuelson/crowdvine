"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Loader2, Truck, X } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { WineZoneLocationPicker } from "@/components/settings/wine-zone-location-picker";
import { cn } from "@/lib/utils";
import { useWineZoneSwitcher } from "@/lib/hooks/use-wine-zone-switcher";
import type { UserZoneAddressTemplate } from "@/lib/checkout/user-zone-delivery-template";
import { useTranslations } from "@/lib/hooks/use-translations";

const fieldInputClass = cn(
  "h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm",
  "placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-0",
  "dark:bg-white dark:text-zinc-900 dark:border-zinc-200 dark:placeholder:text-zinc-500",
  "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:#18181b]",
);

const readonlyInputClass = cn(
  "h-10 cursor-default rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-600",
  "dark:bg-zinc-50 dark:text-zinc-600 dark:border-zinc-200",
);

type DeliveryForm = {
  full_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
};

const emptyDelivery: DeliveryForm = {
  full_name: "",
  phone: "",
  email: "",
  address_line1: "",
  address_line2: "",
  city: "",
  postal_code: "",
};

function rowToForm(row: UserZoneAddressTemplate | null): DeliveryForm {
  if (!row) return { ...emptyDelivery };
  return {
    full_name: row.full_name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address_line1: row.address_line1 ?? "",
    address_line2: row.address_line2 ?? "",
    city: row.city ?? "",
    postal_code: row.postal_code ?? "",
  };
}

function DeliverySection({
  icon: Icon,
  title,
  description,
  children,
  defaultOpen,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border border-border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left md:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-base font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-5 py-5 md:px-6">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function WineZoneSettingsPage() {
  const { t, context } = useTranslations();
  const locale = context.locale === "sv" ? "sv" : "en";
  const router = useRouter();
  const {
    signedIn,
    loading,
    activeZone,
    eligibleZones,
    patchingId,
    selectZone,
  } = useWineZoneSwitcher();

  const [addrLoading, setAddrLoading] = useState(false);
  const [addrSaving, setAddrSaving] = useState(false);
  const [zoneAddress, setZoneAddress] = useState<UserZoneAddressTemplate | null>(
    null,
  );
  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm>(emptyDelivery);

  useEffect(() => {
    if (signedIn === false) {
      router.replace("/log-in");
    }
  }, [signedIn, router]);

  const geoZoneId = activeZone?.geoZoneId?.trim() ?? "";

  const loadZoneAddress = useCallback(async () => {
    if (!geoZoneId) {
      setZoneAddress(null);
      setDeliveryForm(emptyDelivery);
      return;
    }
    setAddrLoading(true);
    try {
      const res = await fetch(
        `/api/user/zone-addresses?geoZoneId=${encodeURIComponent(geoZoneId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setZoneAddress(null);
        setDeliveryForm(emptyDelivery);
        return;
      }
      const j = (await res.json()) as {
        address?: UserZoneAddressTemplate | null;
      };
      const row =
        j.address && typeof j.address === "object" ? j.address : null;
      setZoneAddress(row);
      setDeliveryForm(rowToForm(row));
    } catch {
      setZoneAddress(null);
      setDeliveryForm(emptyDelivery);
    } finally {
      setAddrLoading(false);
    }
  }, [geoZoneId]);

  useEffect(() => {
    if (signedIn !== true) return;
    void loadZoneAddress();
  }, [signedIn, loadZoneAddress]);

  const onSelectZone = async (zoneId: string) => {
    if (zoneId === activeZone?.geoZoneId) return;
    await selectZone(zoneId, t("zone.updated"));
  };

  const saveDelivery = async () => {
    if (!geoZoneId || !activeZone) return;
    const cc = activeZone.countryCode.trim().toUpperCase();
    if (cc.length !== 2) {
      toast.error(t("zone.invalidCountry"));
      return;
    }
    const a1 = deliveryForm.address_line1.trim();
    const city = deliveryForm.city.trim();
    const postal = deliveryForm.postal_code.trim();
    if (!a1 || !city || !postal) {
      toast.error(t("zone.addressRequired"));
      return;
    }

    const rc =
      activeZone.regionCode?.trim().toUpperCase().slice(0, 2) || null;

    setAddrSaving(true);
    try {
      const res = await fetch(
        `/api/user/zone-addresses/${encodeURIComponent(geoZoneId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: deliveryForm.full_name.trim() || undefined,
            phone: deliveryForm.phone.trim() || undefined,
            email: deliveryForm.email.trim() || undefined,
            address_line1: a1,
            address_line2: deliveryForm.address_line2.trim() || undefined,
            city,
            postal_code: postal,
            country_code: cc,
            region_code: rc,
          }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        address?: UserZoneAddressTemplate;
      };
      if (!res.ok) {
        toast.error(body.error ?? t("zone.saveFailed"));
        return;
      }
      if (body.address) {
        setZoneAddress(body.address);
        setDeliveryForm(rowToForm(body.address));
      }
      toast.success(t("zone.deliverySaved"));
      router.refresh();
    } catch {
      toast.error(t("zone.saveFailed"));
    } finally {
      setAddrSaving(false);
    }
  };

  const activeId = activeZone?.geoZoneId ?? "";
  const countryCode = (activeZone?.countryCode ?? "").toUpperCase();
  const displayName = activeZone?.displayName?.trim() || "";

  if (signedIn === false) {
    return null;
  }

  if (loading && signedIn === true) {
    return (
      <PageLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 md:px-sides md:pt-10">
        <div className="relative mb-10 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 rounded-full"
            asChild
          >
            <Link href="/profile" aria-label={t("zone.backToProfile")}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-center text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {t("zone.selectLocation")}
          </h1>
          <Button
            variant="default"
            size="icon"
            className="absolute right-0 h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/90"
            asChild
          >
            <Link href="/profile" aria-label={t("zone.close")}>
              <X className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <p className="mx-auto mb-8 max-w-lg text-center text-sm text-muted-foreground">
          {t("zone.selectLocationSubtitle")}
        </p>

        {loading ? (
          <div className="space-y-8">
            {[1, 2].map((g) => (
              <div key={g} className="space-y-3">
                <Skeleton className="h-5 w-28" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-[72px] rounded-xl" />
                  <Skeleton className="h-[72px] rounded-xl" />
                  <Skeleton className="h-[72px] rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : eligibleZones.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            {t("zone.noZones")}
          </p>
        ) : (
          <WineZoneLocationPicker
            zones={eligibleZones}
            activeZoneId={activeId}
            patchingId={patchingId}
            locale={locale}
            onSelectZone={(id) => void onSelectZone(id)}
          />
        )}

        {geoZoneId ? (
          <div className="mt-10">
            <DeliverySection
              icon={Truck}
              title={
                displayName
                  ? t("zone.deliveryFor", { zone: displayName })
                  : t("zone.deliveryForZone")
              }
              description={t("zone.deliveryOptional")}
              defaultOpen={Boolean(zoneAddress)}
            >
              {addrLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-2/3" />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="z-cc" className="text-sm font-medium">
                        {t("zone.countryZone")}
                      </Label>
                      <Input
                        id="z-cc"
                        readOnly
                        value={countryCode}
                        className={readonlyInputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="z-rc" className="text-sm font-medium">
                        {t("zone.regionZone")}
                      </Label>
                      <Input
                        id="z-rc"
                        readOnly
                        value={activeZone?.regionCode?.toUpperCase() || "—"}
                        className={readonlyInputClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="z-name" className="text-sm font-medium">
                        {t("zone.fullName")}
                      </Label>
                      <Input
                        id="z-name"
                        value={deliveryForm.full_name}
                        onChange={(e) =>
                          setDeliveryForm((f) => ({
                            ...f,
                            full_name: e.target.value,
                          }))
                        }
                        className={fieldInputClass}
                        autoComplete="name"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="z-phone" className="text-sm font-medium">
                          {t("zone.phone")}
                        </Label>
                        <Input
                          id="z-phone"
                          value={deliveryForm.phone}
                          onChange={(e) =>
                            setDeliveryForm((f) => ({
                              ...f,
                              phone: e.target.value,
                            }))
                          }
                          className={fieldInputClass}
                          autoComplete="tel"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="z-email" className="text-sm font-medium">
                          {t("zone.email")}
                        </Label>
                        <Input
                          id="z-email"
                          type="email"
                          value={deliveryForm.email}
                          onChange={(e) =>
                            setDeliveryForm((f) => ({
                              ...f,
                              email: e.target.value,
                            }))
                          }
                          className={fieldInputClass}
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="z-a1" className="text-sm font-medium">
                        {t("zone.street")}
                      </Label>
                      <Input
                        id="z-a1"
                        value={deliveryForm.address_line1}
                        onChange={(e) =>
                          setDeliveryForm((f) => ({
                            ...f,
                            address_line1: e.target.value,
                          }))
                        }
                        className={fieldInputClass}
                        autoComplete="address-line1"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="z-a2" className="text-sm font-medium">
                        {t("zone.address2")}
                      </Label>
                      <Input
                        id="z-a2"
                        value={deliveryForm.address_line2}
                        onChange={(e) =>
                          setDeliveryForm((f) => ({
                            ...f,
                            address_line2: e.target.value,
                          }))
                        }
                        className={fieldInputClass}
                        autoComplete="address-line2"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="z-city" className="text-sm font-medium">
                          {t("zone.city")}
                        </Label>
                        <Input
                          id="z-city"
                          value={deliveryForm.city}
                          onChange={(e) =>
                            setDeliveryForm((f) => ({
                              ...f,
                              city: e.target.value,
                            }))
                          }
                          className={fieldInputClass}
                          autoComplete="address-level2"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="z-postal" className="text-sm font-medium">
                          {t("zone.postalCode")}
                        </Label>
                        <Input
                          id="z-postal"
                          value={deliveryForm.postal_code}
                          onChange={(e) =>
                            setDeliveryForm((f) => ({
                              ...f,
                              postal_code: e.target.value,
                            }))
                          }
                          className={fieldInputClass}
                          autoComplete="postal-code"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    {zoneAddress ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setDeliveryForm(rowToForm(zoneAddress))}
                        disabled={addrSaving}
                      >
                        {t("zone.reset")}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      className="rounded-full bg-foreground text-background hover:bg-foreground/90"
                      onClick={() => void saveDelivery()}
                      disabled={addrSaving}
                    >
                      {addrSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("common.saving")}
                        </>
                      ) : (
                        t("zone.saveDelivery")
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DeliverySection>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
