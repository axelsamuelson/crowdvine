"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, RefreshCw, TrendingUp, Search, ExternalLink } from "lucide-react";
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
};

export default function PriceSourcesPage() {
  const [sources, setSources] = useState<PriceSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSourceId, setRefreshSourceId] = useState<string>("__all__");
  const [detecting, setDetecting] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
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
    const body = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      base_url: form.base_url.trim().replace(/\/$/, ""),
      search_url_template: form.search_url_template.trim() || null,
      adapter_type: form.adapter_type,
      is_active: form.is_active,
      rate_limit_delay_ms: form.rate_limit_delay_ms,
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
        toast.success(`Plattform detekterad: ${adapter_type === "shopify" ? "Shopify" : adapter_type === "woocommerce" ? "WooCommerce" : adapter_type}`);
      } else {
        toast.info("Kunde inte identifiera plattformen. Välj manuellt nedan.");
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Konkurrentpriser</h1>
          <p className="text-sm text-gray-600 mt-1">
            Hantera butiker vi spårar för att hämta priser och länkar till viner (t.ex. morenaturalwine.com, primalwine.com).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={refreshSourceId}
            onValueChange={setRefreshSourceId}
            disabled={refreshing || sources.length === 0}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Alla källor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Alla källor</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={refreshing || sources.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Uppdaterar…" : "Uppdatera alla erbjudanden"}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Lägg till källa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Inga priskällor ännu</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">
              Lägg till en butik (t.ex. morenaturalwine.com) för att automatiskt hämta priser och länkar för era viner.
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Lägg till första källan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sources.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {s.name}
                      {!s.is_active && (
                        <Badge variant="secondary">Inaktiv</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 truncate" title={s.base_url}>
                      {s.base_url}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label="Redigera">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} aria-label="Ta bort" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <span className="text-gray-500">Slug:</span>
                  <span className="font-mono">{s.slug}</span>
                  <span className="text-gray-500">Typ:</span>
                  <span>{s.adapter_type}</span>
                  <span className="text-gray-500">Fördröjning:</span>
                  <span>{s.rate_limit_delay_ms} ms</span>
                </div>
                {s.last_crawled_at && (
                  <p className="text-gray-500 text-xs">
                    Senast uppdaterad: {new Date(s.last_crawled_at).toLocaleString("sv-SE")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sparade träffar</CardTitle>
          <CardDescription>
            Erbjudanden från konkurrentbutiker som matchade era viner. Sorterade med senast uppdaterade först.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {offersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
            </div>
          ) : offers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Inga träffar ännu. Kör &quot;Uppdatera alla erbjudanden&quot; för att hämta priser.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vin / Producent</TableHead>
                  <TableHead>Källa</TableHead>
                  <TableHead className="text-right">Pris</TableHead>
                  <TableHead>Tillgänglig</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Senast</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-medium">
                        {o.wine?.wine_name ?? "—"} {o.wine?.vintage ? `(${o.wine.vintage})` : ""}
                      </div>
                      {o.producer_name && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {o.producer_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{o.price_source?.name ?? o.price_source_id}</TableCell>
                    <TableCell className="text-right">
                      {o.price_amount != null ? `${o.price_amount} ${o.currency}` : "—"}
                    </TableCell>
                    <TableCell>{o.available ? "Ja" : "Nej"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-sm">
                        <span className="text-muted-foreground">
                          {Math.round((o.match_confidence ?? 0) * 100)}%
                        </span>
                        <div className="flex flex-wrap gap-x-3 gap-y-0 text-xs text-muted-foreground">
                          <span title={o.producer_match ? "Producent matchar butikens titel" : "Producent matchar inte"}>
                            Producent: {o.producer_match ? "✓" : "✗"}
                          </span>
                          <span title={o.wine_name_match ? "Vinnamn matchar butikens titel" : "Vinnamn matchar inte"}>
                            Vinnamn: {o.wine_name_match ? "✓" : "✗"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {o.last_fetched_at ? new Date(o.last_fetched_at).toLocaleString("sv-SE") : "—"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={o.pdp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline"
                        title="Öppna i butiken"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Redigera priskälla" : "Lägg till priskälla"}</DialogTitle>
            <DialogDescription>
              Butikens webbadress och sök-URL används för att hitta viner. Använd <code className="text-xs bg-gray-100 px-1 rounded">{`{query}`}</code> där söktermen ska vara.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Namn</Label>
              <Input
                id="name"
                placeholder="t.ex. More Natural Wine"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  if (!editingId && !form.slug) setForm((f) => ({ ...f, slug: slugFromName(e.target.value) }));
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug (unik id)</Label>
              <Input
                id="slug"
                placeholder="t.ex. morenaturalwine"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="base_url">Webbadress</Label>
              <div className="flex gap-2">
                <Input
                  id="base_url"
                  placeholder="https://morenaturalwine.com"
                  value={form.base_url}
                  onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDetectPlatform}
                  disabled={detecting || !form.base_url.trim()}
                  title="Auto-upptäck butikens plattform (Shopify, WooCommerce m.fl.)"
                >
                  <Search className={`h-4 w-4 sm:mr-2 ${detecting ? "animate-pulse" : ""}`} />
                  <span className="hidden sm:inline">{detecting ? "Detekterar…" : "Detektera plattform"}</span>
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="search_url">Sök-URL (valfritt)</Label>
              <Input
                id="search_url"
                placeholder="https://morenaturalwine.com/search?q={query}"
                value={form.search_url_template}
                onChange={(e) => setForm((f) => ({ ...f, search_url_template: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Adapter</Label>
                {detectedPlatform && (
                  <Badge variant="secondary" className="font-normal text-xs shrink-0">
                    Detekterad: {detectedPlatform === "shopify" ? "Shopify" : detectedPlatform === "woocommerce" ? "WooCommerce" : detectedPlatform}
                  </Badge>
                )}
              </div>
              <Select
                value={form.adapter_type}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, adapter_type: v }));
                  setDetectedPlatform(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="woocommerce">WooCommerce</SelectItem>
                </SelectContent>
              </Select>
              {detectedPlatform && (
                <p className="text-xs text-muted-foreground">
                  Du behöver inte ändra adapter – den sattes automatiskt från webbadressen.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delay_ms">Fördröjning mellan anrop (ms)</Label>
              <Input
                id="delay_ms"
                type="number"
                min={500}
                step={500}
                value={form.rate_limit_delay_ms}
                onChange={(e) => setForm((f) => ({ ...f, rate_limit_delay_ms: Number(e.target.value) || 2000 }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Aktiv</Label>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? "Spara" : "Skapa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
