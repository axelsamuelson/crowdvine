"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface SenderDefaults {
  company_name: string;
  company_logo: string;
  company_details: string;
  org_number: string;
  vat_number: string;
  from_name: string;
  from_email: string;
  from_address: string;
  from_postal_code: string;
  from_city: string;
  from_country: string;
  clearing_number: string;
  account_number: string;
  payment_terms: string;
  default_footer: string;
}

const empty: SenderDefaults = {
  company_name: "",
  company_logo: "",
  company_details: "",
  org_number: "",
  vat_number: "",
  from_name: "",
  from_email: "",
  from_address: "",
  from_postal_code: "",
  from_city: "",
  from_country: "",
  clearing_number: "",
  account_number: "",
  payment_terms: "",
  default_footer: "",
};

export function InvoiceSenderDefaultsForm() {
  const [form, setForm] = useState<SenderDefaults>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/invoice-sender-defaults")
      .then((r) => (r.ok ? r.json() : empty))
      .then((data) => setForm({ ...empty, ...data }))
      .catch(() => setForm(empty))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/invoice-sender-defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        // optional: toast
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, company_logo: (reader.result as string) ?? "" }));
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Laddar...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Standard för avsändare</CardTitle>
        <CardDescription>
          Dessa uppgifter fylls i automatiskt när du skapar en ny faktura. Du kan ändra dem i själva fakturan om du vill.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="company_name">Företagsnamn</Label>
          <Input
            id="company_name"
            value={form.company_name}
            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
            placeholder="t.ex. Dirty Wine AB"
          />
        </div>
        <div>
          <Label>Företagslogga</Label>
          <div className="flex items-center gap-4 mt-1">
            <Input type="file" accept="image/*" onChange={handleLogoUpload} className="max-w-xs" />
            {form.company_logo && (
              <div className="h-14 w-14 relative rounded border overflow-hidden bg-muted">
                <img src={form.company_logo} alt="Logo" className="h-full w-full object-contain" />
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-medium">Företagsuppgifter</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="org_number">Organisationsnummer</Label>
              <Input
                id="org_number"
                value={form.org_number}
                onChange={(e) => setForm((f) => ({ ...f, org_number: e.target.value }))}
                placeholder="t.ex. 556123-4567"
              />
            </div>
            <div>
              <Label htmlFor="vat_number">Momsreg.nr</Label>
              <Input
                id="vat_number"
                value={form.vat_number}
                onChange={(e) => setForm((f) => ({ ...f, vat_number: e.target.value }))}
                placeholder="t.ex. SE556123456701"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="company_details">Övrigt (valfritt)</Label>
              <Textarea
                id="company_details"
                value={form.company_details}
                onChange={(e) => setForm((f) => ({ ...f, company_details: e.target.value }))}
                placeholder="Övriga företagsuppgifter"
                rows={2}
              />
            </div>
          </div>
        </div>
        <div className="border-t pt-6">
          <h3 className="font-medium mb-3">Från (kontakt på fakturan)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="from_name">Namn</Label>
              <Input
                id="from_name"
                value={form.from_name}
                onChange={(e) => setForm((f) => ({ ...f, from_name: e.target.value }))}
                placeholder="t.ex. Anna Andersson"
              />
            </div>
            <div>
              <Label htmlFor="from_email">E-post</Label>
              <Input
                id="from_email"
                type="email"
                value={form.from_email}
                onChange={(e) => setForm((f) => ({ ...f, from_email: e.target.value }))}
                placeholder="faktura@foretag.se"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="from_address">Adress</Label>
              <Input
                id="from_address"
                value={form.from_address}
                onChange={(e) => setForm((f) => ({ ...f, from_address: e.target.value }))}
                placeholder="Gatuadress"
              />
            </div>
            <div>
              <Label htmlFor="from_postal_code">Postnummer</Label>
              <Input
                id="from_postal_code"
                value={form.from_postal_code}
                onChange={(e) => setForm((f) => ({ ...f, from_postal_code: e.target.value }))}
                placeholder="t.ex. 111 22"
              />
            </div>
            <div>
              <Label htmlFor="from_city">Stad</Label>
              <Input
                id="from_city"
                value={form.from_city}
                onChange={(e) => setForm((f) => ({ ...f, from_city: e.target.value }))}
                placeholder="t.ex. Stockholm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="from_country">Land</Label>
              <Input
                id="from_country"
                value={form.from_country}
                onChange={(e) => setForm((f) => ({ ...f, from_country: e.target.value }))}
                placeholder="t.ex. Sverige"
              />
            </div>
          </div>
        </div>
        <div className="border-t pt-6">
          <h3 className="font-medium mb-3">Betalningsinformation (standard)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="clearing_number">Clearing number</Label>
              <Input
                id="clearing_number"
                value={form.clearing_number}
                onChange={(e) => setForm((f) => ({ ...f, clearing_number: e.target.value }))}
                placeholder="t.ex. 123-4"
              />
            </div>
            <div>
              <Label htmlFor="account_number">Kontonummer</Label>
              <Input
                id="account_number"
                value={form.account_number}
                onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                placeholder="Bankkontonummer"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="payment_terms">Betalningsvillkor</Label>
              <Input
                id="payment_terms"
                value={form.payment_terms}
                onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
                placeholder="t.ex. Net 30, Betalning inom 30 dagar"
              />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="default_footer">Standardfot (faktura)</Label>
          <Textarea
            id="default_footer"
            value={form.default_footer}
            onChange={(e) => setForm((f) => ({ ...f, default_footer: e.target.value }))}
            placeholder="Tack för din beställning! Betalning inom 30 dagar."
            rows={2}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Sparar..." : "Spara"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
