"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  MoreHorizontal,
  Package,
  Plus,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Provider = {
  id: string;
  name: string;
  code: string | null;
  default_currency: string;
  active: boolean;
  notes: string | null;
};

type Service = {
  id: string;
  provider_id: string;
  name: string;
  direction: string;
  transport_mode: string;
  pricing_type: string;
  route_description: string | null;
  origin_country: string | null;
  origin_region_code: string | null;
  destination_country: string | null;
  destination_region_code: string | null;
  lead_time_min_days: number | null;
  lead_time_max_days: number | null;
  active: boolean;
  notes: string | null;
};

type Rate = {
  id: string;
  freight_service_id: string;
  base_price_amount: number | null;
  currency: string;
  unit_type: string;
  max_weight_kg: number | null;
  max_pallets: number | null;
  pallet_type: string | null;
  valid_from: string | null;
  valid_to: string | null;
  active: boolean;
  pricing_type: string;
  pricing_basis: string | null;
  included_weight_kg: number | null;
  weight_increment_kg: number | null;
  increment_price_amount: number | null;
  volumetric_factor: number | null;
  notes: string | null;
};

type ComponentRow = {
  id: string;
  freight_rate_id: string;
  name: string;
  code: string | null;
  component_kind: string;
  calculation_type: string;
  value: number | null;
  currency: string | null;
  is_mandatory: boolean;
  is_optional: boolean;
  sort_order: number;
  notes: string | null;
};

type Packaging = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  length_m: number | null;
  width_m: number | null;
  height_m: number | null;
  tare_weight_kg: number | null;
  max_bottles: number | null;
  min_bottles: number | null;
  notes: string | null;
};

type Catalogue = {
  providers: Provider[];
  services: Service[];
  rates: Rate[];
  components: ComponentRow[];
  packaging: Packaging[];
};

type EditorKind =
  | "provider"
  | "service"
  | "rate"
  | "component"
  | "packaging"
  | null;

type EditorState = {
  kind: EditorKind;
  id?: string;
  defaults?: Record<string, unknown>;
};

const TRANSPORT_MODES = ["SEA", "ROAD", "RAIL", "AIR", "MULTIMODAL"] as const;
const SERVICE_PRICING = ["RATE_CARD", "SPOT_QUOTE"] as const;
const INBOUND_UNIT_TYPES = ["FIXED", "PER_PALLET", "PER_KG", "SPOT_QUOTE"] as const;
const OUTBOUND_UNIT_TYPES = [
  "FIXED",
  "PER_PALLET",
  "PER_KG",
  "PER_PARCEL",
  "SPOT_QUOTE",
] as const;
const INBOUND_PRICING_TYPES = [
  "FIXED",
  "PER_PALLET",
  "PER_KG",
  "SPOT_QUOTE",
] as const;
const OUTBOUND_PRICING_TYPES = [
  "FIXED",
  "PER_PALLET",
  "PER_KG",
  "PER_PARCEL",
  "INCREMENTAL_WEIGHT",
  "SPOT_QUOTE",
] as const;
const CALC_TYPES = [
  "FIXED",
  "PER_PALLET",
  "PER_KG",
  "PER_PARCEL",
  "PER_PICKUP",
  "PERCENT_OF_BASE",
  "PERCENT_OF_SUBTOTAL",
  "SPOT_QUOTE",
] as const;
const COMPONENT_KINDS = ["SURCHARGE", "ADD_ON", "FEE", "OTHER"] as const;
const PRICING_BASIS = [
  "ACTUAL_WEIGHT",
  "VOLUMETRIC_WEIGHT",
  "MAX_ACTUAL_OR_VOLUMETRIC",
  "FIXED_PER_PARCEL",
] as const;

function fmtNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return String(v);
}

function fieldVal(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

/** Providers that already run this direction, or have no services yet (unassigned). */
function providersEligibleForDirection(
  providers: Provider[],
  services: Service[],
  direction: "INBOUND" | "OUTBOUND",
  showInactive: boolean,
): Provider[] {
  return providers.filter((p) => {
    if (!showInactive && !p.active) return false;
    const dirs = services
      .filter((s) => s.provider_id === p.id)
      .map((s) => s.direction);
    if (dirs.length === 0) return true;
    return dirs.includes(direction);
  });
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 px-2 py-0.5 rounded-md text-[11px] font-medium",
        active
          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
          : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400",
      )}
    >
      {active ? "Aktiv" : "Inaktiv"}
    </span>
  );
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300">
      {children}
    </span>
  );
}

function RowMenu({
  items,
}: {
  items: Array<{
    label: string;
    onClick: () => void;
    destructive?: boolean;
    separatorBefore?: boolean;
  }>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          aria-label="Åtgärder"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {items.map((item) => (
          <div key={item.label}>
            {item.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className={
                item.destructive
                  ? "text-red-600 focus:text-red-600 dark:text-red-400"
                  : undefined
              }
              onClick={item.onClick}
            >
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FreightCatalogueManager() {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ kind: null });
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [showInactive, setShowInactive] = useState(false);
  const [tab, setTab] = useState("inbound");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/freight/catalogue");
      if (!res.ok) {
        setError("Kunde inte ladda fraktkatalogen");
        return;
      }
      setCatalogue(await res.json());
      setError("");
    } catch {
      setError("Kunde inte ladda fraktkatalogen");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (
    kind: Exclude<EditorKind, null>,
    defaults: Record<string, unknown> = {},
  ) => {
    setEditor({ kind, defaults });
    const initial: Record<string, string | boolean> = { active: true };
    for (const [k, v] of Object.entries(defaults)) {
      if (typeof v === "boolean") initial[k] = v;
      else if (v != null) initial[k] = String(v);
    }
    if (kind === "provider") {
      initial.default_currency = String(defaults.default_currency ?? "EUR");
    }
    if (kind === "service") {
      initial.direction = String(defaults.direction ?? "INBOUND");
      initial.transport_mode = String(defaults.transport_mode ?? "ROAD");
      initial.pricing_type = String(defaults.pricing_type ?? "RATE_CARD");
    }
    if (kind === "rate") {
      initial.currency = String(
        defaults.currency ??
          (defaults.direction === "OUTBOUND" ? "SEK" : "EUR"),
      );
      initial.unit_type = String(
        defaults.unit_type ??
          (defaults.direction === "OUTBOUND" ? "PER_PARCEL" : "PER_PALLET"),
      );
      initial.pricing_type = String(
        defaults.pricing_type ??
          (defaults.direction === "OUTBOUND" ? "INCREMENTAL_WEIGHT" : "FIXED"),
      );
    }
    if (kind === "component") {
      initial.component_kind = "SURCHARGE";
      initial.calculation_type = "FIXED";
      initial.is_mandatory = false;
      initial.is_optional = false;
      initial.sort_order = "0";
    }
    setForm(initial);
  };

  const openEdit = (
    kind: Exclude<EditorKind, null>,
    row: Record<string, unknown>,
    extras: Record<string, unknown> = {},
  ) => {
    setEditor({ kind, id: String(row.id), defaults: extras });
    const initial: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries({ ...row, ...extras })) {
      if (typeof v === "boolean") initial[k] = v;
      else if (v != null) initial[k] = String(v);
      else initial[k] = "";
    }
    setForm(initial);
  };

  const closeEditor = () => {
    setEditor({ kind: null });
    setForm({});
  };

  const setField = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!editor.kind) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { kind: editor.kind };
      for (const [k, v] of Object.entries(form)) {
        if (typeof v === "boolean") payload[k] = v;
        else if (v === "") payload[k] = null;
        else payload[k] = v;
      }
      if (editor.defaults?.freight_service_id && !payload.freight_service_id) {
        payload.freight_service_id = editor.defaults.freight_service_id;
      }
      if (editor.defaults?.freight_rate_id && !payload.freight_rate_id) {
        payload.freight_rate_id = editor.defaults.freight_rate_id;
      }
      if (editor.defaults?.provider_id && !payload.provider_id) {
        payload.provider_id = editor.defaults.provider_id;
      }
      if (editor.defaults?.direction && !payload.direction) {
        payload.direction = editor.defaults.direction;
      }

      const isEdit = Boolean(editor.id);
      if (isEdit) payload.id = editor.id;

      const res = await fetch("/api/admin/freight/catalogue", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kunde inte spara");
        return;
      }
      closeEditor();
      await load();
    } catch {
      setError("Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (
    kind: Exclude<EditorKind, null>,
    id: string,
    active: boolean,
  ) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/freight/catalogue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, active }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Kunde inte uppdatera status");
        return;
      }
      await load();
    } catch {
      setError("Kunde inte uppdatera status");
    } finally {
      setSaving(false);
    }
  };

  if (!catalogue) {
    return (
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        {error || "Laddar fraktkatalog…"}
      </p>
    );
  }

  const primaryAction =
    tab === "packaging" ? (
      <Button
        type="button"
        size="sm"
        onClick={() => openCreate("packaging")}
        className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Ny förpackning
      </Button>
    ) : tab === "diagnostic" ? null : (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openCreate("provider")}
          className="rounded-lg text-xs"
        >
          Ny leverantör
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const direction =
              tab === "outbound" ? "OUTBOUND" : "INBOUND";
            const eligible = providersEligibleForDirection(
              catalogue.providers,
              catalogue.services,
              direction,
              false,
            );
            openCreate("service", {
              direction,
              transport_mode: direction === "OUTBOUND" ? "ROAD" : "MULTIMODAL",
              destination_country:
                direction === "OUTBOUND" ? "SE" : undefined,
              provider_id: eligible[0]?.id,
            });
          }}
          className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Ny tjänst
        </Button>
      </div>
    );

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 dark:border-zinc-600"
          />
          Visa inaktiva
        </label>
        {primaryAction}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-1 grid w-full grid-cols-2 sm:grid-cols-4 h-auto text-gray-600 dark:text-zinc-400">
          <TabsTrigger
            value="inbound"
            className="rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
          >
            Inbound
          </TabsTrigger>
          <TabsTrigger
            value="outbound"
            className="rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
          >
            Outbound
          </TabsTrigger>
          <TabsTrigger
            value="packaging"
            className="rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
          >
            Förpackning
          </TabsTrigger>
          <TabsTrigger
            value="diagnostic"
            className="rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
          >
            Diagnostik
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbound" className="mt-6">
          <DirectionCatalogue
            direction="INBOUND"
            catalogue={catalogue}
            showInactive={showInactive}
            onEditProvider={(p) => openEdit("provider", p)}
            onEditService={(s) => openEdit("service", s)}
            onAddRate={(serviceId) =>
              openCreate("rate", {
                freight_service_id: serviceId,
                direction: "INBOUND",
                currency: "EUR",
              })
            }
            onEditRate={(r) => openEdit("rate", r, { direction: "INBOUND" })}
            onAddComponent={(rateId) =>
              openCreate("component", { freight_rate_id: rateId })
            }
            onEditComponent={(c) => openEdit("component", c)}
            onToggleActive={toggleActive}
          />
        </TabsContent>

        <TabsContent value="outbound" className="mt-6">
          <DirectionCatalogue
            direction="OUTBOUND"
            catalogue={catalogue}
            showInactive={showInactive}
            onEditProvider={(p) => openEdit("provider", p)}
            onEditService={(s) => openEdit("service", s)}
            onAddRate={(serviceId) =>
              openCreate("rate", {
                freight_service_id: serviceId,
                direction: "OUTBOUND",
                currency: "SEK",
              })
            }
            onEditRate={(r) => openEdit("rate", r, { direction: "OUTBOUND" })}
            onAddComponent={(rateId) =>
              openCreate("component", { freight_rate_id: rateId })
            }
            onEditComponent={(c) => openEdit("component", c)}
            onToggleActive={toggleActive}
          />
        </TabsContent>

        <TabsContent value="packaging" className="mt-6">
          <PackagingTable
            rows={catalogue.packaging.filter((p) => showInactive || p.active)}
            onEdit={(p) => openEdit("packaging", p)}
            onToggleActive={(p) =>
              void toggleActive("packaging", p.id, !p.active)
            }
          />
        </TabsContent>

        <TabsContent value="diagnostic" className="mt-6">
          <OutboundDiagnostic />
        </TabsContent>
      </Tabs>

      <EditorDialog
        editor={editor}
        form={form}
        setField={setField}
        providers={catalogue.providers}
        services={catalogue.services}
        saving={saving}
        onClose={closeEditor}
        onSave={() => void save()}
      />
    </div>
  );
}

function DirectionCatalogue({
  direction,
  catalogue,
  showInactive,
  onEditProvider,
  onEditService,
  onAddRate,
  onEditRate,
  onAddComponent,
  onEditComponent,
  onToggleActive,
}: {
  direction: "INBOUND" | "OUTBOUND";
  catalogue: Catalogue;
  showInactive: boolean;
  onEditProvider: (p: Provider) => void;
  onEditService: (s: Service) => void;
  onAddRate: (serviceId: string) => void;
  onEditRate: (r: Rate) => void;
  onAddComponent: (rateId: string) => void;
  onEditComponent: (c: ComponentRow) => void;
  onToggleActive: (
    kind: Exclude<EditorKind, null>,
    id: string,
    active: boolean,
  ) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showProviders, setShowProviders] = useState(false);

  const services = useMemo(() => {
    const list = catalogue.services.filter(
      (s) => s.direction === direction && (showInactive || s.active),
    );
    return list.sort((a, b) => {
      const pa = catalogue.providers.find((p) => p.id === a.provider_id)?.name ?? "";
      const pb = catalogue.providers.find((p) => p.id === b.provider_id)?.name ?? "";
      return pa.localeCompare(pb) || a.name.localeCompare(b.name);
    });
  }, [catalogue.services, catalogue.providers, direction, showInactive]);

  const providers = useMemo(
    () =>
      providersEligibleForDirection(
        catalogue.providers,
        catalogue.services,
        direction,
        showInactive,
      ),
    [catalogue.providers, catalogue.services, direction, showInactive],
  );

  useEffect(() => {
    setExpandedId(null);
  }, [direction]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {direction === "INBOUND" ? "Inbound-tjänster" : "Outbound-tjänster"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 max-w-2xl">
            {direction === "INBOUND"
              ? "Pallfrakt in till lager (t.ex. Hillebrand). Ändringar påverkar inte historiska pall-quotes."
              : "Last-mile till kund (t.ex. Instabee). Separat från kundens fraktintäkt."}
          </p>
        </div>

        {services.length === 0 ? (
          <p className="px-6 py-10 text-sm text-center text-gray-500 dark:text-zinc-400">
            Inga {direction.toLowerCase()}-tjänster ännu. Skapa en tjänst ovan.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-zinc-800/80">
            {services.map((service) => {
              const provider = catalogue.providers.find(
                (p) => p.id === service.provider_id,
              );
              const rates = catalogue.rates.filter(
                (r) =>
                  r.freight_service_id === service.id &&
                  (showInactive || r.active),
              );
              const expanded = expandedId === service.id;
              const primaryRate = rates[0];

              return (
                <li key={service.id}>
                  <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-gray-50/80 dark:hover:bg-zinc-900/40">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      onClick={() =>
                        setExpandedId(expanded ? null : service.id)
                      }
                    >
                      <ChevronDown
                        className={cn(
                          "mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
                            {service.name}
                          </p>
                          <StatusBadge active={service.active} />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-gray-500 dark:text-zinc-400">
                            {provider?.name ?? "Okänd leverantör"}
                          </span>
                          {(service.origin_country ||
                            service.destination_country) && (
                            <MetaChip>
                              {[
                                service.origin_country,
                                service.destination_country,
                              ]
                                .filter(Boolean)
                                .join(" → ")}
                            </MetaChip>
                          )}
                          <MetaChip>{service.transport_mode}</MetaChip>
                          <MetaChip>{service.pricing_type}</MetaChip>
                          {primaryRate ? (
                            <MetaChip>
                              {primaryRate.base_price_amount != null
                                ? `${Number(primaryRate.base_price_amount).toFixed(0)} ${primaryRate.currency}`
                                : "SPOT"}
                            </MetaChip>
                          ) : (
                            <MetaChip>Ingen rate</MetaChip>
                          )}
                          {rates.length > 1 ? (
                            <MetaChip>{rates.length} rates</MetaChip>
                          ) : null}
                        </div>
                      </div>
                    </button>
                    <RowMenu
                      items={[
                        {
                          label: "Redigera tjänst",
                          onClick: () => onEditService(service),
                        },
                        {
                          label: "Lägg till rate",
                          onClick: () => onAddRate(service.id),
                        },
                        ...(provider
                          ? [
                              {
                                label: `Redigera ${provider.name}`,
                                onClick: () => onEditProvider(provider),
                              },
                            ]
                          : []),
                        {
                          label: service.active ? "Inaktivera" : "Aktivera",
                          onClick: () =>
                            onToggleActive(
                              "service",
                              service.id,
                              !service.active,
                            ),
                          destructive: service.active,
                          separatorBefore: true,
                        },
                      ]}
                    />
                  </div>

                  {expanded ? (
                    <div className="px-4 sm:px-6 pb-5 pt-1 bg-gray-50/50 dark:bg-zinc-950/40 border-t border-gray-100 dark:border-zinc-800/80">
                      {service.route_description ? (
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3 pl-7">
                          {service.route_description}
                        </p>
                      ) : null}
                      {rates.length === 0 ? (
                        <div className="pl-7 py-4">
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2">
                            Ingen rate kopplad ännu.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg text-xs"
                            onClick={() => onAddRate(service.id)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Lägg till rate
                          </Button>
                        </div>
                      ) : (
                        <div className="pl-0 sm:pl-7 space-y-4">
                          {rates.map((rate) => {
                            const comps = catalogue.components
                              .filter((c) => c.freight_rate_id === rate.id)
                              .sort((a, b) => a.sort_order - b.sort_order);
                            return (
                              <RateDetail
                                key={rate.id}
                                rate={rate}
                                components={comps}
                                onEditRate={() => onEditRate(rate)}
                                onAddComponent={() => onAddComponent(rate.id)}
                                onEditComponent={onEditComponent}
                                onToggleActive={() =>
                                  onToggleActive("rate", rate.id, !rate.active)
                                }
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 sm:px-6 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-zinc-900/40"
          onClick={() => setShowProviders((v) => !v)}
        >
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Leverantörer ({direction === "INBOUND" ? "inbound" : "outbound"})
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {providers.length}{" "}
              {providers.length === 1 ? "leverantör" : "leverantörer"} för denna
              riktning
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gray-400 transition-transform",
              showProviders && "rotate-180",
            )}
          />
        </button>
        {showProviders ? (
          <div className="border-t border-gray-100 dark:border-zinc-800 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-zinc-900/70 hover:bg-gray-50 dark:hover:bg-zinc-900/70">
                  <TableHead className="text-xs">Namn</TableHead>
                  <TableHead className="text-xs">Kod</TableHead>
                  <TableHead className="text-xs">Valuta</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-gray-500">
                      {p.code ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 dark:text-zinc-400">
                      {p.default_currency}
                    </TableCell>
                    <TableCell>
                      <StatusBadge active={p.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RowMenu
                        items={[
                          {
                            label: "Redigera",
                            onClick: () => onEditProvider(p),
                          },
                          {
                            label: p.active ? "Inaktivera" : "Aktivera",
                            onClick: () =>
                              onToggleActive("provider", p.id, !p.active),
                            destructive: p.active,
                            separatorBefore: true,
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RateDetail({
  rate,
  components,
  onEditRate,
  onAddComponent,
  onEditComponent,
  onToggleActive,
}: {
  rate: Rate;
  components: ComponentRow[];
  onEditRate: () => void;
  onAddComponent: () => void;
  onEditComponent: (c: ComponentRow) => void;
  onToggleActive: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0F0F12] overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              {rate.base_price_amount != null
                ? `${Number(rate.base_price_amount).toFixed(2)} ${rate.currency}`
                : `SPOT · ${rate.currency}`}
            </p>
            <StatusBadge active={rate.active} />
            <MetaChip>{rate.pricing_type}</MetaChip>
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {[
              rate.pricing_basis,
              rate.included_weight_kg != null
                ? `inkl ${rate.included_weight_kg} kg`
                : null,
              rate.weight_increment_kg != null
                ? `steg ${rate.weight_increment_kg} kg`
                : null,
              rate.increment_price_amount != null
                ? `${rate.increment_price_amount} ${rate.currency}/steg`
                : null,
              rate.volumetric_factor != null
                ? `vol ${rate.volumetric_factor}`
                : null,
              rate.max_weight_kg != null ? `max ${rate.max_weight_kg} kg` : null,
              rate.pallet_type,
              rate.valid_from || rate.valid_to
                ? `giltig ${rate.valid_from ?? "—"} → ${rate.valid_to ?? "—"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Basrate"}
          </p>
        </div>
        <RowMenu
          items={[
            { label: "Redigera rate", onClick: onEditRate },
            { label: "Lägg till komponent", onClick: onAddComponent },
            {
              label: rate.active ? "Inaktivera" : "Aktivera",
              onClick: onToggleActive,
              destructive: rate.active,
              separatorBefore: true,
            },
          ]}
        />
      </div>

      {components.length === 0 ? (
        <p className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400">
          Inga tilläggskomponenter.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-zinc-900/50 hover:bg-gray-50/80 dark:hover:bg-zinc-900/50">
                <TableHead className="text-[11px]">Komponent</TableHead>
                <TableHead className="text-[11px]">Typ</TableHead>
                <TableHead className="text-[11px] text-right">Värde</TableHead>
                <TableHead className="text-[11px]">Regel</TableHead>
                <TableHead className="text-[11px] w-10"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="py-2">
                    <p className="text-xs font-medium text-gray-900 dark:text-zinc-100">
                      {c.name}
                    </p>
                    {c.code ? (
                      <p className="text-[10px] font-mono text-gray-400">
                        {c.code}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-2 text-[11px] text-gray-500">
                    {c.calculation_type}
                  </TableCell>
                  <TableCell className="py-2 text-right text-xs tabular-nums text-gray-800 dark:text-zinc-200">
                    {c.calculation_type.includes("PERCENT")
                      ? `${c.value}%`
                      : c.calculation_type === "SPOT_QUOTE"
                        ? "Quote"
                        : c.value ?? "—"}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-[11px] text-gray-500">
                      {c.is_mandatory
                        ? "Obligatorisk"
                        : c.is_optional
                          ? "Valfri"
                          : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => onEditComponent(c)}
                    >
                      Redigera
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function PackagingTable({
  rows,
  onEdit,
  onToggleActive,
}: {
  rows: Packaging[];
  onEdit: (p: Packaging) => void;
  onToggleActive: (p: Packaging) => void;
}) {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-[#1F1F23]">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Förpackningsprofiler
          </h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
          Yttermått och tare används för outbound volymvikt. Hitta på inga
          värden.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-6 py-10 text-sm text-center text-gray-500 dark:text-zinc-400">
          Inga förpackningsprofiler ännu.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-zinc-900/70 hover:bg-gray-50 dark:hover:bg-zinc-900/70">
                <TableHead className="text-xs">Profil</TableHead>
                <TableHead className="text-xs">Mått (m)</TableHead>
                <TableHead className="text-xs">Tare</TableHead>
                <TableHead className="text-xs">Flaskor</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {p.name}
                    </p>
                    <p className="text-[11px] font-mono text-gray-400">
                      {p.code}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-gray-600 dark:text-zinc-300">
                    {fmtNum(p.length_m)} × {fmtNum(p.width_m)} ×{" "}
                    {fmtNum(p.height_m)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-gray-600 dark:text-zinc-300">
                    {fmtNum(p.tare_weight_kg)} kg
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 dark:text-zinc-300">
                    {fmtNum(p.min_bottles)}–{fmtNum(p.max_bottles)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={p.active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowMenu
                      items={[
                        { label: "Redigera", onClick: () => onEdit(p) },
                        {
                          label: p.active ? "Inaktivera" : "Aktivera",
                          onClick: () => onToggleActive(p),
                          destructive: p.active,
                          separatorBefore: true,
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function EditorDialog({
  editor,
  form,
  setField,
  providers,
  services,
  saving,
  onClose,
  onSave,
}: {
  editor: EditorState;
  form: Record<string, string | boolean>;
  setField: (key: string, value: string | boolean) => void;
  providers: Provider[];
  services: Service[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const open = editor.kind != null;
  const title =
    editor.kind === "provider"
      ? editor.id
        ? "Redigera leverantör"
        : "Ny leverantör"
      : editor.kind === "service"
        ? editor.id
          ? "Redigera tjänst"
          : "Ny tjänst"
        : editor.kind === "rate"
          ? editor.id
            ? "Redigera rate"
            : "Ny rate"
          : editor.kind === "component"
            ? editor.id
              ? "Redigera komponent"
              : "Ny komponent"
            : editor.kind === "packaging"
              ? editor.id
                ? "Redigera förpackning"
                : "Ny förpackningsprofil"
              : "";

  const direction = String(
    form.direction ?? editor.defaults?.direction ?? "INBOUND",
  );
  const isOutbound = direction === "OUTBOUND";
  const serviceProviders =
    editor.kind === "service"
      ? providersEligibleForDirection(
          providers,
          services,
          isOutbound ? "OUTBOUND" : "INBOUND",
          true,
        )
      : providers;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {editor.kind === "provider" ? (
            <>
              <Field label="Namn">
                <Input
                  value={fieldVal(form.name)}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </Field>
              <Field label="Kod">
                <Input
                  value={fieldVal(form.code)}
                  onChange={(e) => setField("code", e.target.value)}
                />
              </Field>
              <Field label="Valuta">
                <Input
                  value={fieldVal(form.default_currency)}
                  onChange={(e) => setField("default_currency", e.target.value)}
                />
              </Field>
              <Field label="Anteckningar">
                <Textarea
                  value={fieldVal(form.notes)}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={2}
                />
              </Field>
              <ActiveToggle form={form} setField={setField} />
            </>
          ) : null}

          {editor.kind === "service" ? (
            <>
              <Field label="Leverantör">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={fieldVal(form.provider_id)}
                  onChange={(e) => setField("provider_id", e.target.value)}
                >
                  <option value="">Välj…</option>
                  {serviceProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Namn">
                <Input
                  value={fieldVal(form.name)}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Riktning">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={fieldVal(form.direction)}
                    onChange={(e) => {
                      const next = e.target.value as "INBOUND" | "OUTBOUND";
                      setField("direction", next);
                      const eligible = providersEligibleForDirection(
                        providers,
                        services,
                        next,
                        true,
                      );
                      const current = String(form.provider_id || "");
                      if (
                        current &&
                        !eligible.some((p) => p.id === current)
                      ) {
                        setField("provider_id", eligible[0]?.id ?? "");
                      }
                    }}
                  >
                    <option value="INBOUND">INBOUND</option>
                    <option value="OUTBOUND">OUTBOUND</option>
                  </select>
                </Field>
                <Field label="Transport">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={fieldVal(form.transport_mode)}
                    onChange={(e) => setField("transport_mode", e.target.value)}
                  >
                    {TRANSPORT_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Pristyp">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={fieldVal(form.pricing_type)}
                  onChange={(e) => setField("pricing_type", e.target.value)}
                >
                  {SERVICE_PRICING.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ruttbeskrivning">
                <Input
                  value={fieldVal(form.route_description)}
                  onChange={(e) => setField("route_description", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ursprungsland">
                  <Input
                    value={fieldVal(form.origin_country)}
                    onChange={(e) => setField("origin_country", e.target.value)}
                  />
                </Field>
                <Field label="Destinationsland">
                  <Input
                    value={fieldVal(form.destination_country)}
                    onChange={(e) =>
                      setField("destination_country", e.target.value)
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lead time min (dagar)">
                  <Input
                    value={fieldVal(form.lead_time_min_days)}
                    onChange={(e) =>
                      setField("lead_time_min_days", e.target.value)
                    }
                  />
                </Field>
                <Field label="Lead time max (dagar)">
                  <Input
                    value={fieldVal(form.lead_time_max_days)}
                    onChange={(e) =>
                      setField("lead_time_max_days", e.target.value)
                    }
                  />
                </Field>
              </div>
              <Field label="Anteckningar">
                <Textarea
                  value={fieldVal(form.notes)}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={2}
                />
              </Field>
              <ActiveToggle form={form} setField={setField} />
            </>
          ) : null}

          {editor.kind === "rate" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Baspris">
                  <Input
                    value={fieldVal(form.base_price_amount)}
                    onChange={(e) =>
                      setField("base_price_amount", e.target.value)
                    }
                    placeholder="tom = SPOT"
                  />
                </Field>
                <Field label="Valuta">
                  <Input
                    value={fieldVal(form.currency)}
                    onChange={(e) => setField("currency", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit type">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={fieldVal(form.unit_type)}
                    onChange={(e) => setField("unit_type", e.target.value)}
                  >
                    {(isOutbound
                      ? OUTBOUND_UNIT_TYPES
                      : INBOUND_UNIT_TYPES
                    ).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Pricing type">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={fieldVal(form.pricing_type)}
                    onChange={(e) => setField("pricing_type", e.target.value)}
                  >
                    {(isOutbound
                      ? OUTBOUND_PRICING_TYPES
                      : INBOUND_PRICING_TYPES
                    ).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {!isOutbound ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Max vikt (kg)">
                    <Input
                      value={fieldVal(form.max_weight_kg)}
                      onChange={(e) =>
                        setField("max_weight_kg", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Palltyp">
                    <Input
                      value={fieldVal(form.pallet_type)}
                      onChange={(e) => setField("pallet_type", e.target.value)}
                    />
                  </Field>
                </div>
              ) : (
                <>
                  <Field label="Pricing basis">
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={fieldVal(form.pricing_basis)}
                      onChange={(e) =>
                        setField("pricing_basis", e.target.value)
                      }
                    >
                      <option value="">—</option>
                      {PRICING_BASIS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Inkluderad vikt (kg)">
                      <Input
                        value={fieldVal(form.included_weight_kg)}
                        onChange={(e) =>
                          setField("included_weight_kg", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Viktsteg (kg)">
                      <Input
                        value={fieldVal(form.weight_increment_kg)}
                        onChange={(e) =>
                          setField("weight_increment_kg", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Pris per steg">
                      <Input
                        value={fieldVal(form.increment_price_amount)}
                        onChange={(e) =>
                          setField("increment_price_amount", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Volymfaktor (kg/m³)">
                      <Input
                        value={fieldVal(form.volumetric_factor)}
                        onChange={(e) =>
                          setField("volumetric_factor", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Giltig från">
                  <Input
                    type="date"
                    value={fieldVal(form.valid_from).slice(0, 10)}
                    onChange={(e) => setField("valid_from", e.target.value)}
                  />
                </Field>
                <Field label="Giltig till">
                  <Input
                    type="date"
                    value={fieldVal(form.valid_to).slice(0, 10)}
                    onChange={(e) => setField("valid_to", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Anteckningar">
                <Textarea
                  value={fieldVal(form.notes)}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={2}
                />
              </Field>
              <ActiveToggle form={form} setField={setField} />
            </>
          ) : null}

          {editor.kind === "component" ? (
            <>
              <Field label="Namn">
                <Input
                  value={fieldVal(form.name)}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </Field>
              <Field label="Kod">
                <Input
                  value={fieldVal(form.code)}
                  onChange={(e) => setField("code", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kind">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={fieldVal(form.component_kind)}
                    onChange={(e) => setField("component_kind", e.target.value)}
                  >
                    {COMPONENT_KINDS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Beräkning">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={fieldVal(form.calculation_type)}
                    onChange={(e) =>
                      setField("calculation_type", e.target.value)
                    }
                  >
                    {CALC_TYPES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Värde">
                  <Input
                    value={fieldVal(form.value)}
                    onChange={(e) => setField("value", e.target.value)}
                  />
                </Field>
                <Field label="Valuta">
                  <Input
                    value={fieldVal(form.currency)}
                    onChange={(e) => setField("currency", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Sort order">
                <Input
                  value={fieldVal(form.sort_order)}
                  onChange={(e) => setField("sort_order", e.target.value)}
                />
              </Field>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_mandatory === true}
                    onChange={(e) => {
                      setField("is_mandatory", e.target.checked);
                      if (e.target.checked) setField("is_optional", false);
                    }}
                  />
                  Mandatory
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_optional === true}
                    onChange={(e) => {
                      setField("is_optional", e.target.checked);
                      if (e.target.checked) setField("is_mandatory", false);
                    }}
                  />
                  Optional
                </label>
              </div>
              <Field label="Anteckningar">
                <Textarea
                  value={fieldVal(form.notes)}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={2}
                />
              </Field>
            </>
          ) : null}

          {editor.kind === "packaging" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kod">
                  <Input
                    value={fieldVal(form.code)}
                    onChange={(e) => setField("code", e.target.value)}
                  />
                </Field>
                <Field label="Namn">
                  <Input
                    value={fieldVal(form.name)}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="L (m)">
                  <Input
                    value={fieldVal(form.length_m)}
                    onChange={(e) => setField("length_m", e.target.value)}
                  />
                </Field>
                <Field label="W (m)">
                  <Input
                    value={fieldVal(form.width_m)}
                    onChange={(e) => setField("width_m", e.target.value)}
                  />
                </Field>
                <Field label="H (m)">
                  <Input
                    value={fieldVal(form.height_m)}
                    onChange={(e) => setField("height_m", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Tare (kg)">
                  <Input
                    value={fieldVal(form.tare_weight_kg)}
                    onChange={(e) => setField("tare_weight_kg", e.target.value)}
                  />
                </Field>
                <Field label="Min flaskor">
                  <Input
                    value={fieldVal(form.min_bottles)}
                    onChange={(e) => setField("min_bottles", e.target.value)}
                  />
                </Field>
                <Field label="Max flaskor">
                  <Input
                    value={fieldVal(form.max_bottles)}
                    onChange={(e) => setField("max_bottles", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Anteckningar">
                <Textarea
                  value={fieldVal(form.notes)}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={2}
                />
              </Field>
              <ActiveToggle form={form} setField={setField} />
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button type="button" disabled={saving} onClick={onSave}>
            {saving ? "Sparar…" : "Spara"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600 dark:text-zinc-400">{label}</Label>
      {children}
    </div>
  );
}

function ActiveToggle({
  form,
  setField,
}: {
  form: Record<string, string | boolean>;
  setField: (key: string, value: string | boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={form.active !== false}
        onChange={(e) => setField("active", e.target.checked)}
      />
      Aktiv
    </label>
  );
}

function OutboundDiagnostic() {
  const [lengthM, setLengthM] = useState("");
  const [widthM, setWidthM] = useState("");
  const [heightM, setHeightM] = useState("");
  const [bottles, setBottles] = useState("6");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/freight/outbound");
      if (res.ok) setMeta(await res.json());
    })();
  }, []);

  const run = async () => {
    const res = await fetch("/api/admin/freight/outbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination_country: "SE",
        bottle_count: Number(bottles) || 0,
        max_bottles: 6,
        length_m: lengthM ? Number(lengthM) : null,
        width_m: widthM ? Number(widthM) : null,
        height_m: heightM ? Number(heightM) : null,
        as_of_date: "2026-08-01",
      }),
    });
    if (res.ok) setResult(await res.json());
  };

  const packaging = meta?.packaging as
    | {
        code?: string;
        length_m?: number | null;
        width_m?: number | null;
        height_m?: number | null;
      }
    | null
    | undefined;

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-gray-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Outbound-diagnostik
        </h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-zinc-400">
        Snabbkalkyl för Budbee Light SE. Profil{" "}
        <span className="font-medium text-gray-800 dark:text-zinc-200">
          {packaging?.code ?? "—"}
        </span>
        {packaging?.length_m == null
          ? " — dimensioner saknas."
          : ` — ${packaging.length_m}×${packaging.width_m}×${packaging.height_m} m`}
        .
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="L (m)">
          <Input value={lengthM} onChange={(e) => setLengthM(e.target.value)} />
        </Field>
        <Field label="W (m)">
          <Input value={widthM} onChange={(e) => setWidthM(e.target.value)} />
        </Field>
        <Field label="H (m)">
          <Input value={heightM} onChange={(e) => setHeightM(e.target.value)} />
        </Field>
        <Field label="Flaskor">
          <Input value={bottles} onChange={(e) => setBottles(e.target.value)} />
        </Field>
      </div>
      <Button type="button" size="sm" className="rounded-lg text-xs" onClick={() => void run()}>
        Beräkna
      </Button>
      {result?.breakdown ? (
        <pre className="text-[11px] text-gray-600 dark:text-zinc-400 overflow-auto rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-3">
          {JSON.stringify(result.breakdown, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
