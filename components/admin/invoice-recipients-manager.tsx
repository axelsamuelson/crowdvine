"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Företagsprofiler</CardTitle>
              <CardDescription>
                Företag som kan väljas som fakturakund. Lägg till uppgifter här så fylls de i automatiskt när du skapar en faktura (under Bookings → Dirty Wine → Skapa faktura).
              </CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Lägg till företag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Laddar...</div>
          ) : recipients.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium mb-1">Inga företag sparade</p>
              <p className="text-sm text-muted-foreground mb-4">
                Lägg till företag med fakturauppgifter så kan du välja dem när du skapar en faktura.
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Lägg till företag
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Företag</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Org.nr</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Kontakt</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">E-post</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">Åtgärder</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="p-2 font-medium">{r.company_name || "—"}</td>
                      <td className="p-2 text-sm text-muted-foreground font-mono">{r.org_number || "—"}</td>
                      <td className="p-2 text-sm text-muted-foreground">{r.contact_name || "—"}</td>
                      <td className="p-2 text-sm">{r.email || "—"}</td>
                      <td className="p-2 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Redigera företag" : "Lägg till företag"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="org_number">Organisationsnummer (ABPI)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="org_number"
                  value={form.org_number}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, org_number: e.target.value }));
                    setAbpiError(null);
                  }}
                  placeholder="t.ex. 556074-7551"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchFromAbpi}
                  disabled={abpiLoading}
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
                <p className="text-sm text-destructive mt-1">{abpiError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Fyll i org.nr och klicka för att hämta företagsnamn, adress och kontakt från ABPI.se (gratis, max 100/dag).
              </p>
            </div>
            {businessUsers.length > 0 && (
              <div>
                <Label>Koppla till befintlig användare (valfritt)</Label>
                <Select
                  value={form.profile_id ? form.profile_id : "__none__"}
                  onValueChange={handleLinkUser}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj användare för att fylla i kontakt/email" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Ingen koppling —</SelectItem>
                    {businessUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email || u.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Välj en business-användare för att fylla i kontakt och e-post automatiskt.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="company_name">Företagsnamn</Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                placeholder="t.ex. AB Vinhandel"
              />
            </div>
            <div>
              <Label htmlFor="contact_name">Kontaktperson</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                placeholder="t.ex. Anna Andersson"
              />
            </div>
            <div>
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="faktura@foretag.se"
              />
            </div>
            <div>
              <Label htmlFor="address">Adress</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Gatuadress"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postal_code">Postnummer</Label>
                <Input
                  id="postal_code"
                  value={form.postal_code}
                  onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                  placeholder="t.ex. 111 22"
                />
              </div>
              <div>
                <Label htmlFor="city">Stad</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="t.ex. Stockholm"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={save}>{editingId ? "Spara" : "Lägg till"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
