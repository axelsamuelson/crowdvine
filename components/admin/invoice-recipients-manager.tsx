"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Pencil, Trash2, Search } from "lucide-react";

export interface InvoiceRecipientRow {
  id: string;
  created_at: string;
  updated_at: string;
  profile_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  address: string;
  postal_code?: string | null;
  city?: string | null;
  org_number?: string | null;
}

interface BusinessUser {
  id: string;
  email: string | null;
  full_name: string | null;
}

export function InvoiceRecipientsManager() {
  const [recipients, setRecipients] = useState<InvoiceRecipientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>([]);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    address: "",
    postal_code: "",
    city: "",
    profile_id: "",
    org_number: "",
  });
  const [abpiLoading, setAbpiLoading] = useState(false);
  const [abpiError, setAbpiError] = useState<string | null>(null);

  const fetchRecipients = () => {
    fetch("/api/admin/invoice-recipients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRecipients(Array.isArray(data) ? data : []))
      .catch(() => setRecipients([]));
  };

  useEffect(() => {
    setLoading(true);
    fetchRecipients();
    fetch("/api/admin/business-users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setBusinessUsers(Array.isArray(data) ? data : []))
      .catch(() => setBusinessUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ company_name: "", contact_name: "", email: "", address: "", postal_code: "", city: "", profile_id: "", org_number: "" });
    setAbpiError(null);
    setDialogOpen(true);
  };

  const openEdit = (r: InvoiceRecipientRow) => {
    setEditingId(r.id);
    setForm({
      company_name: r.company_name || "",
      contact_name: r.contact_name || "",
      email: r.email || "",
      address: r.address || "",
      postal_code: r.postal_code || "",
      city: r.city || "",
      profile_id: r.profile_id || "",
      org_number: r.org_number || "",
    });
    setAbpiError(null);
    setDialogOpen(true);
  };

  const fetchFromAbpi = async () => {
    const raw = form.org_number?.trim() || "";
    if (!raw) {
      setAbpiError("Ange organisationsnummer först.");
      return;
    }
    setAbpiLoading(true);
    setAbpiError(null);
    try {
      const res = await fetch(`/api/admin/company-lookup?orgnr=${encodeURIComponent(raw)}`);
      const data = await res.json();
      if (!res.ok) {
        setAbpiError(data.error || "Kunde inte hämta företagsdata.");
        return;
      }
      setForm((f) => ({
        ...f,
        company_name: data.company_name ?? f.company_name,
        contact_name: data.contact_name ?? f.contact_name,
        address: data.address ?? f.address,
        postal_code: data.postal_code ?? f.postal_code,
        city: data.city ?? f.city,
        org_number: data.org_number ?? f.org_number,
      }));
    } catch {
      setAbpiError("Nätverksfel. Försök igen.");
    } finally {
      setAbpiLoading(false);
    }
  };

  const handleLinkUser = (profileId: string) => {
    if (!profileId || profileId === "__none__") {
      setForm((f) => ({ ...f, profile_id: "" }));
      return;
    }
    const u = businessUsers.find((x) => x.id === profileId);
    if (u) {
      setForm((f) => ({
        ...f,
        profile_id: profileId,
        contact_name: (u.full_name || f.contact_name).trim(),
        email: (u.email || f.email).trim(),
      }));
    }
  };

  const save = async () => {
    const body = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      postal_code: form.postal_code.trim() || "",
      city: form.city.trim() || "",
      profile_id: form.profile_id || null,
      org_number: form.org_number.trim() || "",
    };
    if (editingId) {
      const res = await fetch(`/api/admin/invoice-recipients/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        fetchRecipients();
        setDialogOpen(false);
      }
    } else {
      const res = await fetch("/api/admin/invoice-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        fetchRecipients();
        setDialogOpen(false);
      }
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Ta bort detta företag från listan?")) return;
    const res = await fetch(`/api/admin/invoice-recipients/${id}`, { method: "DELETE" });
    if (res.ok) fetchRecipients();
  };

  return (
    <>
      <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-zinc-400">
              Företagsprofiler (fakturakunder)
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50">
              {loading ? "…" : recipients.length} företag
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            Lägg till företag
          </Button>
        </div>
        <div className="p-2">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-zinc-400">Laddar...</div>
          ) : recipients.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-zinc-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-1">Inga företag sparade</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
                Lägg till företag med fakturauppgifter så kan du välja dem när du skapar en faktura.
              </p>
              <Button
                onClick={openCreate}
                size="sm"
                className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Lägg till företag
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {recipients.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-gray-200 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shrink-0">
                    <Building2 className="w-4 h-4 text-gray-700 dark:text-zinc-100" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-zinc-100 truncate">{r.company_name || "—"}</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">{r.org_number || "—"}</p>
                    </div>
                    <p className="text-gray-700 dark:text-zinc-300 truncate">{r.contact_name || "—"}</p>
                    <p className="text-gray-700 dark:text-zinc-300 truncate">{r.email || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 dark:text-zinc-400" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 dark:text-red-400" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1F1F23] border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">{editingId ? "Redigera företag" : "Lägg till företag"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="org_number" className="text-gray-700 dark:text-zinc-300">Organisationsnummer (ABPI)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="org_number"
                  value={form.org_number}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, org_number: e.target.value }));
                    setAbpiError(null);
                  }}
                  placeholder="t.ex. 556074-7551"
                  className="flex-1 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchFromAbpi}
                  disabled={abpiLoading}
                  className="border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white"
                >
                  {abpiLoading ? "Hämtar…" : (
                    <>
                      <Search className="h-4 w-4 mr-1" />
                      Hämta från ABPI
                    </>
                  )}
                </Button>
              </div>
              {abpiError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{abpiError}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Fyll i org.nr och klicka för att hämta företagsnamn, adress och kontakt från ABPI.se (gratis, max 100/dag).
              </p>
            </div>
            {businessUsers.length > 0 && (
              <div>
                <Label className="text-gray-700 dark:text-zinc-300">Koppla till befintlig användare (valfritt)</Label>
                <Select
                  value={form.profile_id ? form.profile_id : "__none__"}
                  onValueChange={handleLinkUser}
                >
                  <SelectTrigger className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white mt-1">
                    <SelectValue placeholder="Välj användare för att fylla i kontakt/email" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1F1F23] border-gray-200 dark:border-zinc-700 z-[100]">
                    <SelectItem value="__none__">— Ingen koppling —</SelectItem>
                    {businessUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email || u.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                  Välj en business-användare för att fylla i kontakt och e-post automatiskt.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="company_name" className="text-gray-700 dark:text-zinc-300">Företagsnamn</Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                placeholder="t.ex. AB Vinhandel"
                className="mt-1 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="contact_name" className="text-gray-700 dark:text-zinc-300">Kontaktperson</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                placeholder="t.ex. Anna Andersson"
                className="mt-1 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-700 dark:text-zinc-300">E-post</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="faktura@foretag.se"
                className="mt-1 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="address" className="text-gray-700 dark:text-zinc-300">Adress</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Gatuadress"
                className="mt-1 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postal_code" className="text-gray-700 dark:text-zinc-300">Postnummer</Label>
                <Input
                  id="postal_code"
                  value={form.postal_code}
                  onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                  placeholder="t.ex. 111 22"
                  className="mt-1 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-gray-700 dark:text-zinc-300">Stad</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="t.ex. Stockholm"
                  className="mt-1 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white">
              Avbryt
            </Button>
            <Button onClick={save} className="bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900">{editingId ? "Spara" : "Lägg till"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
