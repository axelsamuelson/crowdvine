"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, RefreshCw, TrendingUp, Search, ExternalLink, ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PriceSource {
  id: string;
  name: string;
  slug: string;
  base_url: string;
  search_url_template?: string | null;
  sitemap_url?: string | null;
  adapter_type: string;
  is_active: boolean;
  rate_limit_delay_ms: number;
  last_crawled_at?: string | null;
  config?: Record<string, unknown>;
}

const defaultForm = {
  name: "",
  slug: "",
  base_url: "",
  search_url_template: "",
  adapter_type: "shopify",
  is_active: true,
  rate_limit_delay_ms: 2000,
  default_currency: "",
};

export default function PriceSourcesPage() {
  const [sources, setSources] = useState<PriceSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSourceId, setRefreshSourceId] = useState<string>("__all__");
  const [sourcePopoverOpen, setSourcePopoverOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [detectionFailed, setDetectionFailed] = useState(false);
  const [offers, setOffers] = useState<
    Array<{
      id: string;
      wine_id: string;
      price_source_id: string;
      pdp_url: string;
      price_amount: number | null;
      currency: string;
      available: boolean;
      title_raw: string | null;
      match_confidence: number;
      last_fetched_at: string;
      price_source?: { name: string; slug: string } | null;
      wine?: { wine_name: string; vintage: string; producer_name?: string | null } | null;
      producer_name?: string | null;
      producer_match?: boolean;
      wine_name_match?: boolean;
    }>
  >([]);
  const [offersLoading, setOffersLoading] = useState(true);

  const loadSources = async () => {
    try {
      const res = await fetch("/api/admin/price-sources");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Kunde inte ladda priskällor");
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      const res = await fetch("/api/admin/price-sources/offers");
      if (!res.ok) throw new Error("Failed to load offers");
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : []);
    } catch {
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
    loadOffers();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDetectedPlatform(null);
    setShowDialog(true);
  };

  const openEdit = (s: PriceSource) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      slug: s.slug,
      base_url: s.base_url,
      search_url_template: s.search_url_template ?? "",
      adapter_type: s.adapter_type,
      is_active: s.is_active,
      rate_limit_delay_ms: s.rate_limit_delay_ms,
      default_currency: (s.config?.default_currency as string) ?? "",
    });
    setDetectedPlatform(null);
    setShowDialog(true);
  };

  const slugFromName = (name: string) =>
    name
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9-]/g, "");

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.base_url.trim()) {
      toast.error("Namn, slug och webbadress krävs");
      return;
    }
    const existingConfig = (editingId ? sources.find((s) => s.id === editingId)?.config : null) ?? {};
    const config: Record<string, unknown> = { ...existingConfig } as Record<string, unknown>;
    if (form.default_currency?.trim()) {
      config.default_currency = form.default_currency.trim().toUpperCase();
    } else {
      delete config.default_currency;
    }
    const body = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      base_url: form.base_url.trim().replace(/\/$/, ""),
      search_url_template: form.search_url_template.trim() || null,
      adapter_type: form.adapter_type,
      is_active: form.is_active,
      rate_limit_delay_ms: form.rate_limit_delay_ms,
      config,
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/price-sources/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Kunde inte uppdatera");
        }
        toast.success("Priskälla uppdaterad");
      } else {
        const res = await fetch("/api/admin/price-sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Kunde inte skapa");
        }
        toast.success("Priskälla skapad");
      }
      setShowDialog(false);
      loadSources();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Något gick fel");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ta bort denna priskälla? Alla sparade erbjudanden för källan tas bort.")) return;
    try {
      const res = await fetch(`/api/admin/price-sources/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Kunde inte ta bort");
      toast.success("Priskälla borttagen");
      loadSources();
    } catch {
      toast.error("Kunde inte ta bort");
    }
  };

  const handleDetectPlatform = async () => {
    const url = form.base_url.trim().replace(/\/$/, "") || form.base_url;
    if (!url) {
      toast.error("Ange webbadress först");
      return;
    }
    setDetecting(true);
    try {
      const res = await fetch("/api/admin/price-sources/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Detektering misslyckades");
      const adapter_type = data.adapter_type ?? null;
      if (adapter_type) {
        setForm((f) => ({ ...f, adapter_type }));
        setDetectedPlatform(adapter_type);
        setDetectionFailed(false);
        toast.success(`Plattform detekterad: ${adapter_type === "shopify" ? "Shopify" : adapter_type === "woocommerce" ? "WooCommerce" : adapter_type === "prestashop" ? "PrestaShop" : adapter_type === "webnode" ? "Webnode" : adapter_type === "lightspeed" ? "Lightspeed" : adapter_type === "drupal" ? "Drupal" : adapter_type === "vin_sensible" ? "Vin Sensible" : adapter_type === "vivino" ? "Vivino" : adapter_type}`);
      } else {
        setDetectionFailed(true);
        const urlLower = url.toLowerCase();
        if (urlLower.includes("hedonism")) {
          setForm((f) => ({ ...f, adapter_type: "drupal" }));
          setDetectedPlatform("drupal");
          toast.success("Plattform kunde inte detekteras (t.ex. Cloudflare). Drupal är vald för hedonism.co.uk – spara källan om det stämmer.");
        } else if (urlLower.includes("altrovino")) {
          setForm((f) => ({ ...f, adapter_type: "prestashop" }));
          setDetectedPlatform("prestashop");
          toast.success("Plattform kunde inte detekteras (t.ex. 403). PrestaShop är vald för altrovino.be – spara källan om det stämmer.");
        } else if (urlLower.includes("vin-sensible")) {
          setForm((f) => ({ ...f, adapter_type: "vin_sensible" }));
          setDetectedPlatform("vin_sensible");
          toast.success("Plattform kunde inte detekteras. Vin Sensible är vald för boutique.vin-sensible.fr – spara källan om det stämmer.");
        } else {
          toast.info("Kunde inte identifiera plattformen. Välj plattform manuellt i listan nedan.");
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte detektera plattform");
    } finally {
      setDetecting(false);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/price-sources/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: refreshSourceId === "__all__" ? undefined : refreshSourceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh misslyckades");
      const sourceLabel =
        refreshSourceId === "__all__"
          ? "alla källor"
          : sources.find((s) => s.id === refreshSourceId)?.name ?? "vald källa";
      toast.success(`Klar. ${data.processed ?? 0} viner behandlade för ${sourceLabel}.`);
      loadSources();
      loadOffers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte uppdatera erbjudanden");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <TrendingUp className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Konkurrentpriser</h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-0.5">
              Hantera butiker vi spårar för att hämta priser och länkar till viner (t.ex. morenaturalwine.com, primalwine.com).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={sourcePopoverOpen} onOpenChange={setSourcePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={refreshing || sources.length === 0}
                className="w-[200px] justify-between rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
                aria-label="Välj källa att uppdatera"
              >
                <span className="truncate">
                  {refreshSourceId === "__all__"
                    ? "Alla källor"
                    : sources.find((s) => s.id === refreshSourceId)?.name ?? "Välj källa"}
                </span>
                <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 rounded-xl" align="start">
              <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setRefreshSourceId("__all__");
                    setSourcePopoverOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 ${refreshSourceId === "__all__" ? "bg-gray-100 dark:bg-zinc-800 font-medium text-gray-900 dark:text-zinc-100" : "text-gray-900 dark:text-zinc-100"}`}
                >
                  Alla källor
                </button>
                {sources.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setRefreshSourceId(s.id);
                      setSourcePopoverOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 ${refreshSourceId === s.id ? "bg-gray-100 dark:bg-zinc-800 font-medium text-gray-900 dark:text-zinc-100" : "text-gray-900 dark:text-zinc-100"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={refreshing || sources.length === 0}
            className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Uppdaterar…" : "Uppdatera alla erbjudanden"}
          </Button>
          <Button size="sm" onClick={openCreate} className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Lägg till källa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-zinc-700 border-t-gray-900 dark:border-t-zinc-100" />
        </div>
      ) : sources.length === 0 ? (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] flex flex-col items-center justify-center py-12">
          <TrendingUp className="h-12 w-12 text-gray-400 dark:text-zinc-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Inga priskällor ännu</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4 max-w-md text-center">
            Lägg till en butik (t.ex. morenaturalwine.com) för att automatiskt hämta priser och länkar för era viner.
          </p>
          <Button size="sm" onClick={openCreate} className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Lägg till första källan
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sources.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{s.name}</h3>
                    {!s.is_active && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                        Inaktiv
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 truncate" title={s.base_url}>
                    {s.base_url}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-600 dark:text-zinc-400" onClick={() => openEdit(s)} aria-label="Redigera">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(s.id)} aria-label="Ta bort">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <span className="text-gray-500 dark:text-zinc-400">Slug:</span>
                  <span className="font-mono text-gray-900 dark:text-zinc-100">{s.slug}</span>
                  <span className="text-gray-500 dark:text-zinc-400">Typ:</span>
                  <span className="text-gray-900 dark:text-zinc-100">{s.adapter_type}</span>
                  <span className="text-gray-500 dark:text-zinc-400">Fördröjning:</span>
                  <span className="text-gray-900 dark:text-zinc-100">{s.rate_limit_delay_ms} ms</span>
                </div>
                {s.last_crawled_at && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Senast uppdaterad: {new Date(s.last_crawled_at).toLocaleString("sv-SE")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sparade träffar</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Erbjudanden från konkurrentbutiker som matchade era viner. Sorterade med senast uppdaterade först.
          </p>
        </div>
        <div className="p-6">
          {offersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-zinc-700 border-t-gray-900 dark:border-t-zinc-100" />
            </div>
          ) : offers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-zinc-400 py-4">Inga träffar ännu. Kör &quot;Uppdatera alla erbjudanden&quot; för att hämta priser.</p>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-zinc-900/70 border-b border-gray-200 dark:border-zinc-800">
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Vin / Producent</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Källa</TableHead>
                    <TableHead className="text-right text-xs font-medium text-gray-600 dark:text-zinc-400">Pris</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Tillgänglig</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Match</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Senast</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((o) => (
                    <TableRow key={o.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                      <TableCell>
                        <div className="font-medium text-gray-900 dark:text-zinc-100">
                          {o.wine?.wine_name ?? "—"} {o.wine?.vintage ? `(${o.wine.vintage})` : ""}
                        </div>
                        {o.producer_name && (
                          <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                            {o.producer_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 dark:text-zinc-100">{o.price_source?.name ?? o.price_source_id}</TableCell>
                      <TableCell className="text-right text-sm text-gray-900 dark:text-zinc-100">
                        {o.price_amount != null ? `${o.price_amount} ${o.currency}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-zinc-300">{o.available ? "Ja" : "Nej"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 text-sm">
                          {(() => {
                            const pct = (o.match_confidence ?? 0) * 100;
                            const isApproved = pct >= 40;
                            return (
                              <span
                                className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  isApproved
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                }`}
                              >
                                {isApproved ? "Godkänd" : "Ej godkänd"} ({Math.round(pct)}%)
                              </span>
                            );
                          })()}
                          <div className="flex flex-wrap gap-x-3 gap-y-0 text-xs text-gray-500 dark:text-zinc-400">
                            <span title={o.producer_match ? "Producent matchar butikens titel" : "Producent matchar inte"}>
                              Producent: {o.producer_match ? "✓" : "✗"}
                            </span>
                            <span title={o.wine_name_match ? "Vinnamn matchar butikens titel" : "Vinnamn matchar inte"}>
                              Vinnamn: {o.wine_name_match ? "✓" : "✗"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 dark:text-zinc-400">
                        {o.last_fetched_at ? new Date(o.last_fetched_at).toLocaleString("sv-SE") : "—"}
                      </TableCell>
                      <TableCell>
                        <a
                          href={o.pdp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-gray-900 dark:text-zinc-100 hover:underline"
                          title="Öppna i butiken"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md rounded-xl border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-zinc-100">{editingId ? "Redigera priskälla" : "Lägg till priskälla"}</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-zinc-400">
              Butikens webbadress och sök-URL används för att hitta viner. Använd <code className="text-xs bg-gray-100 dark:bg-zinc-800 px-1 rounded">{`{query}`}</code> där söktermen ska vara.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-gray-700 dark:text-zinc-300">Namn</Label>
              <Input
                id="name"
                placeholder="t.ex. More Natural Wine"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  if (!editingId && !form.slug) setForm((f) => ({ ...f, slug: slugFromName(e.target.value) }));
                }}
                className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug" className="text-gray-700 dark:text-zinc-300">Slug (unik id)</Label>
              <Input
                id="slug"
                placeholder="t.ex. morenaturalwine"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="base_url" className="text-gray-700 dark:text-zinc-300">Webbadress</Label>
              <div className="flex gap-2">
                <Input
                  id="base_url"
                  placeholder="https://morenaturalwine.com"
                  value={form.base_url}
                  onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                  className="flex-1 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDetectPlatform}
                  disabled={detecting || !form.base_url.trim()}
                  title="Auto-upptäck butikens plattform (Shopify, WooCommerce m.fl.)"
                  className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
                >
                  <Search className={`h-3.5 w-3.5 sm:mr-2 ${detecting ? "animate-pulse" : ""}`} />
                  <span className="hidden sm:inline">{detecting ? "Detekterar…" : "Detektera plattform"}</span>
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="search_url" className="text-gray-700 dark:text-zinc-300">Sök-URL (valfritt)</Label>
              <Input
                id="search_url"
                placeholder="https://morenaturalwine.com/search?q={query}"
                value={form.search_url_template}
                onChange={(e) => setForm((f) => ({ ...f, search_url_template: e.target.value }))}
                className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-gray-700 dark:text-zinc-300">Adapter</Label>
                {detectedPlatform && (
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 shrink-0">
                    Detekterad: {detectedPlatform === "shopify" ? "Shopify" : detectedPlatform === "woocommerce" ? "WooCommerce" : detectedPlatform === "prestashop" ? "PrestaShop" : detectedPlatform === "webnode" ? "Webnode" : detectedPlatform === "lightspeed" ? "Lightspeed" : detectedPlatform === "drupal" ? "Drupal" : detectedPlatform === "vin_sensible" ? "Vin Sensible" : detectedPlatform}
                  </span>
                )}
              </div>
              <Select
                value={form.adapter_type}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, adapter_type: v }));
                  setDetectedPlatform(null);
                  setDetectionFailed(false);
                }}
              >
                <SelectTrigger className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                  <SelectValue placeholder="Välj plattform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="woocommerce">WooCommerce</SelectItem>
                  <SelectItem value="prestashop">PrestaShop</SelectItem>
                  <SelectItem value="webnode">Webnode</SelectItem>
                  <SelectItem value="lightspeed">Lightspeed</SelectItem>
                  <SelectItem value="drupal">Drupal (t.ex. hedonism.co.uk)</SelectItem>
                  <SelectItem value="vin_sensible">Vin Sensible (boutique.vin-sensible.fr)</SelectItem>
                  <SelectItem value="vivino">Vivino (vivino.com)</SelectItem>
                </SelectContent>
              </Select>
              {detectedPlatform && (
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Du behöver inte ändra adapter – den sattes automatiskt från webbadressen.
                </p>
              )}
              {detectionFailed && !detectedPlatform && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Detektering lyckades inte (t.ex. Cloudflare eller 403). Välj rätt plattform i listan ovan – t.ex. Drupal för hedonism.co.uk, PrestaShop för altrovino.be, Vin Sensible för boutique.vin-sensible.fr.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="default_currency" className="text-gray-700 dark:text-zinc-300">Standardvaluta</Label>
              <Select
                value={form.default_currency || "__auto__"}
                onValueChange={(v) => setForm((f) => ({ ...f, default_currency: v === "__auto__" ? "" : v }))}
              >
                <SelectTrigger id="default_currency" className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                  <SelectValue placeholder="Auto (från sidan)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Auto (från sidan)</SelectItem>
                  <SelectItem value="SEK">SEK</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="DKK">DKK</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Används när butiken inte anger valuta (t.ex. Shopify .js). Sätt till EUR för winely.store.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delay_ms" className="text-gray-700 dark:text-zinc-300">Fördröjning mellan anrop (ms)</Label>
              <Input
                id="delay_ms"
                type="number"
                min={500}
                step={500}
                value={form.rate_limit_delay_ms}
                onChange={(e) => setForm((f) => ({ ...f, rate_limit_delay_ms: Number(e.target.value) || 2000 }))}
                className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active" className="text-gray-700 dark:text-zinc-300">Aktiv</Label>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)} className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700">
              Avbryt
            </Button>
            <Button size="sm" onClick={handleSubmit} className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200">
              {editingId ? "Spara" : "Skapa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
