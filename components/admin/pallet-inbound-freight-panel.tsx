"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  calculateFreightQuoteBreakdown,
  type FreightComponentInput,
  type FreightQuoteBreakdown,
} from "@/lib/freight-pricing";

type Catalogue = {
  providers: Array<{ id: string; name: string; code: string | null }>;
  services: Array<{
    id: string;
    provider_id: string;
    name: string;
    direction: string;
    transport_mode: string;
    pricing_type: string;
    route_description: string | null;
    lead_time_min_days: number | null;
    lead_time_max_days: number | null;
  }>;
  rates: Array<{
    id: string;
    freight_service_id: string;
    base_price_amount: number | null;
    currency: string;
    max_weight_kg: number | null;
    pallet_type: string | null;
    pricing_type: string;
    active: boolean;
  }>;
  components: Array<{
    id: string;
    freight_rate_id: string;
    name: string;
    code: string | null;
    component_kind: string;
    calculation_type: string;
    value: number | null;
    is_mandatory: boolean;
    is_optional: boolean;
    sort_order: number;
  }>;
};

type QuoteRow = {
  id: string;
  status: string;
  selected: boolean;
  currency: string;
  total_amount_minor: number | null;
  total_cost_sek_cents: number | null;
  fx_rate_to_sek: number | null;
  economically_usable: boolean;
  requires_spot_quote: boolean;
  transport_mode: string | null;
  provider?: { name: string } | null;
  service?: { name: string } | null;
};

function formatMoney(minor: number | null, currency: string) {
  if (minor == null) return "—";
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

export function PalletInboundFreightPanel({ palletId }: { palletId: string }) {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [rateId, setRateId] = useState("");
  const [spotMajor, setSpotMajor] = useState("");
  const [addonSelected, setAddonSelected] = useState<Record<string, boolean>>(
    {},
  );
  const [addonSpot, setAddonSpot] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [catRes, qRes] = await Promise.all([
      fetch("/api/admin/freight/catalogue"),
      fetch(`/api/admin/pallets/${palletId}/freight-quotes`),
    ]);
    if (catRes.ok) setCatalogue(await catRes.json());
    if (qRes.ok) {
      const data = await qRes.json();
      setQuotes(data.quotes ?? []);
    }
  }, [palletId]);

  useEffect(() => {
    void load();
  }, [load]);

  const inboundServices = useMemo(
    () =>
      (catalogue?.services ?? []).filter(
        (s) =>
          s.direction === "INBOUND" &&
          catalogue?.providers.some((p) => p.id === s.provider_id),
      ),
    [catalogue],
  );

  const selectedService = inboundServices.find((s) => s.id === serviceId);
  const ratesForService = useMemo(
    () =>
      (catalogue?.rates ?? []).filter(
        (r) => r.freight_service_id === serviceId && r.active,
      ),
    [catalogue?.rates, serviceId],
  );
  const selectedRate =
    ratesForService.find((r) => r.id === rateId) ?? ratesForService[0] ?? null;
  const selectedRateId = selectedRate?.id ?? "";

  useEffect(() => {
    if (selectedRateId && selectedRateId !== rateId) {
      setRateId(selectedRateId);
    }
  }, [selectedRateId, rateId]);

  const rateComponents = useMemo(
    () =>
      (catalogue?.components ?? []).filter(
        (c) => c.freight_rate_id === selectedRateId,
      ),
    [catalogue?.components, selectedRateId],
  );

  const buildComponents = useCallback((): FreightComponentInput[] => {
    return rateComponents.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      componentKind: c.component_kind as FreightComponentInput["componentKind"],
      calculationType:
        c.calculation_type as FreightComponentInput["calculationType"],
      value: c.value != null ? Number(c.value) : null,
      isMandatory: c.is_mandatory,
      isOptional: c.is_optional,
      sortOrder: c.sort_order,
      selected: c.is_optional ? !!addonSelected[c.id] : true,
      suppliedAmountMajor:
        c.calculation_type === "SPOT_QUOTE" && addonSelected[c.id]
          ? addonSpot[c.id]
            ? Number(addonSpot[c.id])
            : null
          : null,
    }));
  }, [rateComponents, addonSelected, addonSpot]);

  // Derive preview — do not setState in an effect (unstable deps caused
  // Maximum update depth / storefront error boundary when selecting a service).
  const preview: FreightQuoteBreakdown | null = useMemo(() => {
    if (!selectedService) return null;
    const isSpot = selectedService.pricing_type === "SPOT_QUOTE";
    return calculateFreightQuoteBreakdown({
      currency: selectedRate?.currency ?? "EUR",
      baseAmountMajor: isSpot
        ? null
        : selectedRate?.base_price_amount != null
          ? Number(selectedRate.base_price_amount)
          : null,
      palletCount: 1,
      components: buildComponents(),
      servicePricingType: isSpot ? "SPOT_QUOTE" : "RATE_CARD",
      serviceSpotAmountMajor: isSpot && spotMajor ? Number(spotMajor) : null,
    });
  }, [selectedService, selectedRate, buildComponents, spotMajor]);

  const createQuote = async (selectIfUsable: boolean) => {
    if (!selectedService || !catalogue) return;
    const providerId = selectedService.provider_id;
    const isSpot = selectedService.pricing_type === "SPOT_QUOTE";
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/pallets/${palletId}/freight-quotes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_id: providerId,
            freight_service_id: selectedService.id,
            freight_rate_id: selectedRate?.id ?? null,
            transport_mode: selectedService.transport_mode,
            currency: selectedRate?.currency ?? "EUR",
            base_amount_major: isSpot
              ? null
              : selectedRate?.base_price_amount != null
                ? Number(selectedRate.base_price_amount)
                : null,
            service_pricing_type: isSpot ? "SPOT_QUOTE" : "RATE_CARD",
            service_spot_amount_major:
              isSpot && spotMajor ? Number(spotMajor) : null,
            max_weight_kg: selectedRate?.max_weight_kg ?? null,
            pallet_type: selectedRate?.pallet_type ?? null,
            components: buildComponents(),
            lead_time_min_days: selectedService.lead_time_min_days,
            lead_time_max_days: selectedService.lead_time_max_days,
            select_if_usable: selectIfUsable,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(
        data.quote?.economically_usable
          ? "Freight quote saved"
          : "Quote saved (incomplete — not usable as economic target)",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save quote");
    } finally {
      setSaving(false);
    }
  };

  const selectQuote = async (quoteId: string) => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/pallets/${palletId}/freight-quotes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "select", quote_id: quoteId }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Selected inbound freight quote");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Select failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            Inbound freight (shadow)
          </h3>
          <p className="text-xs text-zinc-500">
            Does not change live 120-bottle readiness or customer shipping.
          </p>
        </div>
        <a
          href="/admin/freight"
          className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
        >
          Fraktalternativ
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Service</Label>
          <select
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setRateId("");
              setSpotMajor("");
            }}
          >
            <option value="">Select…</option>
            {inboundServices.map((s) => {
              const provider = catalogue?.providers.find(
                (p) => p.id === s.provider_id,
              );
              return (
                <option key={s.id} value={s.id}>
                  {provider?.name ?? "?"} — {s.name} ({s.transport_mode})
                </option>
              );
            })}
          </select>
        </div>
        {selectedService?.pricing_type === "SPOT_QUOTE" ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">
              Spot quote amount (EUR)
            </Label>
            <Input
              value={spotMajor}
              onChange={(e) => setSpotMajor(e.target.value)}
              placeholder="Required for economic target"
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Rate</Label>
            <select
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              value={rateId}
              onChange={(e) => setRateId(e.target.value)}
            >
              {ratesForService.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.base_price_amount != null
                    ? `${Number(r.base_price_amount).toFixed(2)} ${r.currency}`
                    : "Spot"}{" "}
                  · {r.pallet_type ?? "pallet"}
                  {r.max_weight_kg != null ? ` · max ${r.max_weight_kg} kg` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {rateComponents.some((c) => c.is_optional) ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400">Optional add-ons</p>
          {rateComponents
            .filter((c) => c.is_optional)
            .map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 text-sm text-zinc-300"
              >
                <div className="flex items-center gap-2 min-w-[10rem]">
                  <Switch
                    checked={!!addonSelected[c.id]}
                    onCheckedChange={(v) =>
                      setAddonSelected((prev) => ({ ...prev, [c.id]: v }))
                    }
                  />
                  <span>{c.name}</span>
                </div>
                {addonSelected[c.id] && c.calculation_type === "SPOT_QUOTE" ? (
                  <Input
                    className="w-36 bg-zinc-900 border-zinc-700 h-8"
                    placeholder="Quote EUR"
                    value={addonSpot[c.id] ?? ""}
                    onChange={(e) =>
                      setAddonSpot((prev) => ({
                        ...prev,
                        [c.id]: e.target.value,
                      }))
                    }
                  />
                ) : null}
              </div>
            ))}
        </div>
      ) : null}

      {preview ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300 space-y-1 font-mono">
          <div className="flex justify-between">
            <span>Base</span>
            <span>{formatMoney(preview.baseAmountMinor, preview.currency)}</span>
          </div>
          {preview.components.map((c, i) => (
            <div key={i} className="flex justify-between text-zinc-400">
              <span>
                {c.name}
                {c.catalogueValue != null &&
                (c.calculationType === "PERCENT_OF_BASE" ||
                  c.calculationType === "PERCENT_OF_SUBTOTAL")
                  ? ` ${c.catalogueValue}%`
                  : ""}
                {!c.selected ? " (off)" : c.missingAmount ? " (needs quote)" : ""}
              </span>
              <span>
                {c.selected
                  ? formatMoney(c.amountMinor, preview.currency)
                  : "—"}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t border-zinc-700 pt-1 font-semibold text-zinc-100">
            <span>Estimated total</span>
            <span>
              {preview.canCalculate
                ? formatMoney(preview.subtotalAmountMinor, preview.currency)
                : "Price required"}
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!serviceId || saving}
          onClick={() => void createQuote(false)}
          className="bg-zinc-800 text-zinc-100"
        >
          Save quote
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!serviceId || saving}
          onClick={() => void createQuote(true)}
          className="bg-emerald-700 text-white hover:bg-emerald-600"
        >
          Save & select if usable
        </Button>
      </div>

      {quotes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400">Saved quotes</p>
          <ul className="space-y-1.5">
            {quotes.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-800 px-2 py-1.5 text-xs text-zinc-300"
              >
                <span>
                  {q.provider?.name ?? "?"} · {q.service?.name ?? "?"} ·{" "}
                  {q.transport_mode ?? "—"} · {q.status}
                  {q.selected ? " · SELECTED" : ""}
                  {" · "}
                  {formatMoney(q.total_amount_minor, q.currency)}
                  {q.total_cost_sek_cents != null
                    ? ` → ${(q.total_cost_sek_cents / 100).toFixed(0)} SEK`
                    : ""}
                  {q.fx_rate_to_sek != null
                    ? ` @ ${Number(q.fx_rate_to_sek).toFixed(4)}`
                    : ""}
                </span>
                {!q.selected && q.economically_usable ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={saving}
                    onClick={() => void selectQuote(q.id)}
                  >
                    Select
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
