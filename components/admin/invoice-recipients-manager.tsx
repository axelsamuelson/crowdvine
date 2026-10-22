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
import { Building2, Plus, Pencil, Trash2, Search, Star } from "lucide-react";
import { saveInvoiceRecipientAction } from "@/lib/actions/invoice-recipients";
import type { InvoiceRecipient } from "@/app/api/admin/invoice-recipients/route";

interface BusinessUser {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface ContactDraft {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  is_primary: boolean;
}

const fieldClass =
  "mt-1 min-h-[44px] bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white";

function emptyContact(isPrimary: boolean): ContactDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
    phone: "",
    title: "",
    is_primary: isPrimary,
  };
}

function contactsFromRecipient(recipient: InvoiceRecipient): ContactDraft[] {
  return recipient.contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    title: contact.title ?? "",
    is_primary: contact.is_primary,
  }));
}

export function InvoiceRecipientsManager() {
  const [recipients, setRecipients] = useState<InvoiceRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>([]);
  const [form, setForm] = useState({
    company_name: "",
    email: "",
    address: "",
    postal_code: "",
    city: "",
    profile_id: "",
    org_number: "",
  });
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [abpiLoading, setAbpiLoading] = useState(false);
  const [abpiError, setAbpiError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    setForm({
      company_name: "",
      email: "",
      address: "",
      postal_code: "",
      city: "",
      profile_id: "",
      org_number: "",
    });
    setContacts([]);
    setAbpiError(null);
    setSaveError(null);
    setDialogOpen(true);
  };

  const openEdit = (recipient: InvoiceRecipient) => {
    setEditingId(recipient.id);
    setForm({
      company_name: recipient.company_name || "",
      email: recipient.email || "",
      address: recipient.address || "",
      postal_code: recipient.postal_code || "",
      city: recipient.city || "",
      profile_id: recipient.profile_id || "",
      org_number: recipient.org_number || "",
    });
    setContacts(contactsFromRecipient(recipient));
    setAbpiError(null);
    setSaveError(null);
    setDialogOpen(true);
  };

  const setPrimary = (id: string) => {
    setContacts((rows) =>
      rows.map((row) => ({ ...row, is_primary: row.id === id ? !row.is_primary : false })),
    );
  };

  const updateContact = (id: string, patch: Partial<ContactDraft>) => {
    setContacts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addContact = (contact: ContactDraft) => {
    setContacts((rows) => {
      const next = contact.is_primary
        ? rows.map((row) => ({ ...row, is_primary: false }))
        : rows;
      return [...next, contact];
    });
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
      const data = (await res.json()) as {
        error?: string;
        company_name?: string;
        contact_name?: string;
        contact_title?: string;
        address?: string;
        postal_code?: string;
        city?: string;
        org_number?: string;
        phone?: string;
      };
      if (!res.ok) {
        setAbpiError(data.error || "Kunde inte hämta företagsdata.");
        return;
      }
      setForm((current) => ({
        ...current,
        company_name: data.company_name ?? current.company_name,
        address: data.address ?? current.address,
        postal_code: data.postal_code ?? current.postal_code,
        city: data.city ?? current.city,
        org_number: data.org_number ?? current.org_number,
      }));
      if (data.contact_name?.trim()) {
        addContact({
          id: crypto.randomUUID(),
          name: data.contact_name.trim(),
          email: "",
          phone: data.phone ?? "",
          title: data.contact_title ?? "",
          is_primary: contacts.every((contact) => !contact.is_primary),
        });
      }
    } catch {
      setAbpiError("Nätverksfel. Försök igen.");
    } finally {
      setAbpiLoading(false);
    }
  };

  const handleLinkUser = (profileId: string) => {
    if (!profileId || profileId === "__none__") {
      setForm((current) => ({ ...current, profile_id: "" }));
      return;
    }
    const user = businessUsers.find((row) => row.id === profileId);
    if (!user) return;
    setForm((current) => ({
      ...current,
      profile_id: profileId,
      email: current.email.trim() ? current.email : (user.email || "").trim(),
    }));
    addContact({
      id: crypto.randomUUID(),
      name: (user.full_name || user.email || "Kontakt").trim(),
      email: (user.email || "").trim(),
      phone: "",
      title: "",
      is_primary: true,
    });
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    const result = await saveInvoiceRecipientAction({
      id: editingId ?? undefined,
      company_name: form.company_name.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      postal_code: form.postal_code.trim(),
      city: form.city.trim(),
      profile_id: form.profile_id || null,
      org_number: form.org_number.trim(),
      contacts: contacts.map((contact) => ({
        id: contact.id,
        name: contact.name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        title: contact.title.trim(),
        is_primary: contact.is_primary,
      })),
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    fetchRecipients();
    setDialogOpen(false);
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
            className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
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
                className="min-h-[44px] rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Lägg till företag
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto] gap-3 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                <span className="w-8" />
                <span className="grid grid-cols-3 gap-2">
                  <span>Företag</span>
                  <span>Fakturamejl</span>
                  <span>Primär kontakt</span>
                </span>
                <span className="w-[88px]" />
              </div>
              {recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-gray-200 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shrink-0">
                    <Building2 className="w-4 h-4 text-gray-700 dark:text-zinc-100" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-zinc-100 truncate">
                        {recipient.company_name || "—"}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                        {recipient.org_number || "—"}
                      </p>
                    </div>
                    <p className="text-gray-700 dark:text-zinc-300 truncate">{recipient.email || "—"}</p>
                    <div className="min-w-0">
                      <p className="text-gray-700 dark:text-zinc-300 truncate">
                        {recipient.primary_contact?.name || "—"}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                        {recipient.primary_contact?.email || ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-[44px] min-w-[44px] text-gray-600 dark:text-zinc-400"
                      onClick={() => openEdit(recipient)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-[44px] min-w-[44px] text-red-600 dark:text-red-400"
                      onClick={() => remove(recipient.id)}
                    >
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1F1F23] border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {editingId ? "Redigera företag" : "Lägg till företag"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="org_number" className="text-gray-700 dark:text-zinc-300">Organisationsnummer (ABPI)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="org_number"
                  value={form.org_number}
                  onChange={(e) => {
                    setForm((current) => ({ ...current, org_number: e.target.value }));
                    setAbpiError(null);
                  }}
                  placeholder="t.ex. 556074-7551"
                  className={`flex-1 ${fieldClass}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchFromAbpi}
                  disabled={abpiLoading}
                  className="min-h-[44px] border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white"
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
                Fyll i org.nr och klicka för att hämta företagsnamn och adress. Kontaktperson från ABPI läggs som en egen rad.
              </p>
            </div>
            {businessUsers.length > 0 && (
              <div>
                <Label className="text-gray-700 dark:text-zinc-300">Koppla till befintlig användare (valfritt)</Label>
                <Select
                  value={form.profile_id ? form.profile_id : "__none__"}
                  onValueChange={handleLinkUser}
                >
                  <SelectTrigger className="min-h-[44px] bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white mt-1">
                    <SelectValue placeholder="Välj användare för att lägga till kontakt" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1F1F23] border-gray-200 dark:border-zinc-700 z-[100]">
                    <SelectItem value="__none__">— Ingen koppling —</SelectItem>
                    {businessUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email || user.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                  Lägger användarens namn och e-post som ny primär kontakt. Fakturamejlet ändras bara om det är tomt.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="company_name" className="text-gray-700 dark:text-zinc-300">Företagsnamn</Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => setForm((current) => ({ ...current, company_name: e.target.value }))}
                placeholder="t.ex. AB Vinhandel"
                className={fieldClass}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-700 dark:text-zinc-300">Fakturamejl</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                placeholder="faktura@foretag.se"
                className={fieldClass}
              />
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Hit skickas fakturor.</p>
            </div>
            <div>
              <Label htmlFor="address" className="text-gray-700 dark:text-zinc-300">Adress</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                placeholder="Gatuadress"
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postal_code" className="text-gray-700 dark:text-zinc-300">Postnummer</Label>
                <Input
                  id="postal_code"
                  value={form.postal_code}
                  onChange={(e) => setForm((current) => ({ ...current, postal_code: e.target.value }))}
                  placeholder="t.ex. 111 22"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-gray-700 dark:text-zinc-300">Stad</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm((current) => ({ ...current, city: e.target.value }))}
                  placeholder="t.ex. Stockholm"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-200 dark:border-zinc-700 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Kontaktpersoner</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    addContact(emptyContact(contacts.every((contact) => !contact.is_primary) && contacts.length === 0))
                  }
                  className="min-h-[44px] border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Lägg till kontaktperson
                </Button>
              </div>
              {contacts.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-zinc-400">Inga kontaktpersoner ännu.</p>
              )}
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-lg border border-gray-200 dark:border-zinc-700 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPrimary(contact.id)}
                      className="min-h-[44px] inline-flex items-center gap-2 text-sm text-gray-800 dark:text-zinc-100"
                      aria-pressed={contact.is_primary}
                    >
                      <Star
                        className={contact.is_primary ? "h-4 w-4 fill-amber-400 text-amber-500" : "h-4 w-4 text-gray-400"}
                      />
                      {contact.is_primary ? "Primär kontakt" : "Gör primär"}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setContacts((rows) => rows.filter((row) => row.id !== contact.id))}
                      className="min-h-[44px] text-red-600 dark:text-red-400"
                    >
                      Ta bort
                    </Button>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-zinc-300">Namn</Label>
                    <Input
                      value={contact.name}
                      onChange={(e) => updateContact(contact.id, { name: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-zinc-300">E-post</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(contact.id, { email: e.target.value })}
                      className={fieldClass}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateContact(contact.id, { email: form.email.trim() })}
                      className="mt-2 min-h-[44px] border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white"
                    >
                      Samma som fakturamejl
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-700 dark:text-zinc-300">Telefon</Label>
                      <Input
                        value={contact.phone}
                        onChange={(e) => updateContact(contact.id, { phone: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-zinc-300">Titel</Label>
                      <Input
                        value={contact.title}
                        onChange={(e) => updateContact(contact.id, { title: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {saveError && (
              <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="min-h-[44px] border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white"
            >
              Avbryt
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="min-h-[44px] bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
            >
              {saving ? "Sparar…" : editingId ? "Spara" : "Lägg till"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
