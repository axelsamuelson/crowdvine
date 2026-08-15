"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Catalogue = {
  providers: Array<{
    id: string;
    name: string;
    code: string | null;
    default_currency: string;
    active: boolean;
    notes: string | null;
  }>;
  services: Array<{
    id: string;
    provider_id: string;
    name: string;
    direction: string;
    transport_mode: string;
    pricing_type: string;
    route_description: string | null;
    origin_region_code: string | null;
  }>;
  rates: Array<{
    id: string;
    freight_service_id: string;
    base_price_amount: number | null;
    currency: string;
    max_weight_kg: number | null;
    pallet_type: string | null;
    pricing_type: string;
  }>;
  components: Array<{
    id: string;
    freight_rate_id: string;
    name: string;
    calculation_type: string;
    value: number | null;
    is_mandatory: boolean;
    is_optional: boolean;
  }>;
};

export default function FreightAdminPage() {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/freight/catalogue");
        if (!res.ok) {
          setError("Failed to load freight catalogue");
          return;
        }
        setCatalogue(await res.json());
      } catch {
        setError("Failed to load freight catalogue");
      }
    })();
  }, []);

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/pallets"
          className="text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">
            Freight catalogue
          </h1>
          <p className="text-sm text-zinc-500">
            Providers, services, rates, and components. Pallet quotes freeze
            snapshots — rate-card edits do not change historical quotes.
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {!catalogue ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="space-y-8">
          {catalogue.providers.map((provider) => {
            const services = catalogue.services.filter(
              (s) => s.provider_id === provider.id,
            );
            return (
              <section
                key={provider.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-4"
              >
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">
                    {provider.name}
                    {provider.code ? (
                      <span className="ml-2 text-xs font-normal text-zinc-500">
                        {provider.code}
                      </span>
                    ) : null}
                  </h2>
                  {provider.notes ? (
                    <p className="text-xs text-zinc-500 mt-1">{provider.notes}</p>
                  ) : null}
                </div>
                {services.map((service) => {
                  const rates = catalogue.rates.filter(
                    (r) => r.freight_service_id === service.id,
                  );
                  return (
                    <div
                      key={service.id}
                      className="rounded-md border border-zinc-800/80 p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="text-sm font-medium text-zinc-200">
                          {service.name}
                        </h3>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                          {service.direction} · {service.transport_mode} ·{" "}
                          {service.pricing_type}
                        </span>
                      </div>
                      {service.route_description ? (
                        <p className="text-xs text-zinc-500">
                          {service.route_description}
                        </p>
                      ) : null}
                      {rates.map((rate) => {
                        const comps = catalogue.components.filter(
                          (c) => c.freight_rate_id === rate.id,
                        );
                        return (
                          <div key={rate.id} className="text-xs text-zinc-400 pl-2">
                            <p className="text-zinc-300">
                              Base:{" "}
                              {rate.base_price_amount != null
                                ? `${Number(rate.base_price_amount).toFixed(2)} ${rate.currency}`
                                : "SPOT — enter on pallet quote"}
                              {rate.pallet_type
                                ? ` · ${rate.pallet_type}`
                                : ""}
                              {rate.max_weight_kg != null
                                ? ` · max ${rate.max_weight_kg} kg`
                                : ""}
                            </p>
                            <ul className="mt-1 space-y-0.5">
                              {comps.map((c) => (
                                <li key={c.id}>
                                  {c.name}:{" "}
                                  {c.calculation_type === "PERCENT_OF_BASE" ||
                                  c.calculation_type === "PERCENT_OF_SUBTOTAL"
                                    ? `${c.value}% (${c.calculation_type})`
                                    : c.calculation_type === "SPOT_QUOTE"
                                      ? "requires quote"
                                      : `${c.value ?? "—"} (${c.calculation_type})`}
                                  {c.is_mandatory
                                    ? " · mandatory"
                                    : c.is_optional
                                      ? " · optional"
                                      : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
