"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Trash2, Plus, Wine } from "lucide-react";
import type { InvoiceData } from "@/types/invoice";
import { formatCurrency, currencies, getInvoiceVatRateSelectOptions } from "@/lib/invoice-utils";

export interface InvoiceWine {
  id: string;
  wine_name: string;
  vintage: string;
  producers?: { name?: string } | null;
  base_price_cents?: number | null;
  /** Warehouse (B2B) price exkl. moms in SEK – same as tasting summary / dirtywine.se. Use as default when adding to invoice. */
  b2b_price_excl_vat?: number | null;
}

export interface InvoiceRecipientOption {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  address: string;
  postal_code?: string | null;
  city?: string | null;
}

interface InvoiceFormProps {
  invoiceData: InvoiceData;
  handleInvoiceChange: (field: string, value: string | number | boolean) => void;
  handleItemChange: (id: string, field: string, value: string | number) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addItem: () => void;
  addItemFromWine?: (wine: InvoiceWine) => void;
  /** Företag att välja för att fylla i Till-fälten. */
  recipients?: InvoiceRecipientOption[];
  selectedRecipientId?: string | null;
  onSelectRecipient?: (id: string | null) => void;
  removeItem: (id: string) => void;
  calculateItemDiscount: (item: InvoiceData["items"][0]) => number;
  calculateItemTotal: (item: InvoiceData["items"][0]) => number;
  calculateTotalItemDiscounts: () => number;
  calculateSubtotal: () => number;
  calculateDiscount: () => number;
  calculateTaxableAmount: () => number;
  calculateTax: () => number;
  calculateTotal: () => number;
}

function InvoiceEditSection({
  title,
  description,
  children,
  bodyClassName,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
      <div className="border-b border-border bg-muted/50 px-5 py-3 sm:px-6 dark:bg-zinc-800/50 dark:border-zinc-700">
        <h2 className="text-sm font-semibold tracking-tight text-foreground dark:text-zinc-100">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      <div className={cn("p-5 sm:p-6 text-card-foreground dark:text-zinc-100", bodyClassName)}>{children}</div>
    </section>
  );
}

export function InvoiceForm({
  invoiceData,
  handleInvoiceChange,
  handleItemChange,
  handleLogoUpload,
  addItem,
  addItemFromWine,
  recipients = [],
  selectedRecipientId = null,
  onSelectRecipient,
  removeItem,
  calculateItemDiscount,
  calculateItemTotal,
  calculateTotalItemDiscounts,
  calculateSubtotal,
  calculateDiscount,
  calculateTax,
  calculateTaxableAmount,
  calculateTotal,
}: InvoiceFormProps) {
  const [wines, setWines] = useState<InvoiceWine[]>([]);
  const [winesLoading, setWinesLoading] = useState(false);
  const [winePopoverOpen, setWinePopoverOpen] = useState(false);
  /** Default on: invoice line items should match sellable B2B lager. */
  const [winesB2bStockOnly, setWinesB2bStockOnly] = useState(true);

  useEffect(() => {
    if (!addItemFromWine) return;
    const fetchWines = async () => {
      setWinesLoading(true);
      try {
        const stockQ = winesB2bStockOnly ? "&b2b_in_stock=1" : "";
        const res = await fetch(`/api/admin/wines?for_invoice=1${stockQ}`);
        if (res.ok) {
          const data = await res.json();
          setWines(Array.isArray(data) ? data : []);
        }
      } catch {
        setWines([]);
      } finally {
        setWinesLoading(false);
      }
    };
    fetchWines();
  }, [addItemFromWine, winesB2bStockOnly]);

  const handleSelectWine = (wine: InvoiceWine) => {
    addItemFromWine?.(wine);
    setWinePopoverOpen(false);
  };

  return (
    <div className="space-y-6 dark:[&_label]:text-zinc-100">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0">
      <InvoiceEditSection
        title="Faktura & utfärdare"
        description="Grunduppgifter, moms, rabatt, frakt och vem som står som avsändare på fakturan."
        bodyClassName="space-y-0"
      >
        <div className="grid grid-cols-1 gap-8 2xl:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-zinc-400">Faktura</p>
              <div>
                <Label htmlFor="invoiceNumber">Fakturanummer</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => handleInvoiceChange("invoiceNumber", e.target.value)}
                  className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <Label htmlFor="date">Fakturadatum</Label>
                <Input
                  id="date"
                  type="date"
                  value={invoiceData.date}
                  onChange={(e) => handleInvoiceChange("date", e.target.value)}
                  className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Förfallodatum</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => handleInvoiceChange("dueDate", e.target.value)}
                  className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <Label htmlFor="currency">Valuta</Label>
                <Select value={invoiceData.currency} onValueChange={(value) => handleInvoiceChange("currency", value)}>
                  <SelectTrigger id="currency" className="border-input bg-background dark:border-zinc-700 dark:bg-zinc-900">
                    <SelectValue placeholder="Välj valuta" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="taxRate">Momssats</Label>
                <Select
                  value={String(
                    Number.isFinite(invoiceData.taxRate) ? invoiceData.taxRate : 25,
                  )}
                  onValueChange={(v) => handleInvoiceChange("taxRate", Number.parseFloat(v) || 0)}
                >
                  <SelectTrigger id="taxRate" className="border-input bg-background dark:border-zinc-700 dark:bg-zinc-900">
                    <SelectValue placeholder="Välj momssats" />
                  </SelectTrigger>
                  <SelectContent>
                    {getInvoiceVatRateSelectOptions(
                      Number.isFinite(invoiceData.taxRate) ? invoiceData.taxRate : 25,
                    ).map((opt) => (
                      <SelectItem key={`vat-${opt.rate}`} value={String(opt.rate)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fakturarabatt</Label>
                <div className="mt-2 space-y-4">
                  <RadioGroup
                    value={invoiceData.discountType}
                    onValueChange={(value) => handleInvoiceChange("discountType", value as "percentage" | "amount")}
                    className="flex flex-wrap items-center gap-4 sm:gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="percentage" id="percentage" />
                      <Label htmlFor="percentage" className="cursor-pointer text-sm font-normal">
                        Procent (%)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="amount" id="amount" />
                      <Label htmlFor="amount" className="cursor-pointer text-sm font-normal">
                        Belopp
                      </Label>
                    </div>
                  </RadioGroup>
                  <Input
                    type="number"
                    min="0"
                    step={invoiceData.discountType === "percentage" ? "0.01" : "0.01"}
                    value={invoiceData.discountValue}
                    onChange={(e) => handleInvoiceChange("discountValue", Number.parseFloat(e.target.value) || 0)}
                    placeholder={invoiceData.discountType === "percentage" ? "%" : invoiceData.currency}
                    className="w-full border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="applyInvoiceDiscountToDiscountedItems"
                      checked={invoiceData.applyInvoiceDiscountToDiscountedItems}
                      onCheckedChange={(checked) =>
                        handleInvoiceChange("applyInvoiceDiscountToDiscountedItems", checked === true)
                      }
                    />
                    <Label htmlFor="applyInvoiceDiscountToDiscountedItems" className="cursor-pointer text-sm font-normal">
                      Applicera fakturarabatt även på rader som redan har rabatt
                    </Label>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="shippingHandlingAmount">Frakt / hantering ({invoiceData.currency})</Label>
                <Input
                  id="shippingHandlingAmount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={invoiceData.shippingHandlingAmount ?? 0}
                  onChange={(e) =>
                    handleInvoiceChange("shippingHandlingAmount", Number.parseFloat(e.target.value) || 0)
                  }
                  className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-zinc-400">Företag på fakturan</p>
                <div>
                  <Label htmlFor="companyName">Företagsnamn</Label>
                  <Input
                    id="companyName"
                    value={invoiceData.companyName}
                    onChange={(e) => handleInvoiceChange("companyName", e.target.value)}
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <Label htmlFor="companyLogo">Logotyp</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="companyLogo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="flex-1"
                    />
                    {invoiceData.companyLogo && (
                      <div className="h-12 w-12 relative">
                        <img
                          src={invoiceData.companyLogo || "/placeholder.svg"}
                          alt="Company Logo"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="companyOrgNumber">Organisationsnummer</Label>
                    <Input
                      id="companyOrgNumber"
                      value={invoiceData.companyOrgNumber ?? ""}
                      onChange={(e) => handleInvoiceChange("companyOrgNumber", e.target.value)}
                      placeholder="t.ex. 556123-4567"
                      className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyVatNumber">Momsreg.nr</Label>
                    <Input
                      id="companyVatNumber"
                      value={invoiceData.companyVatNumber ?? ""}
                      onChange={(e) => handleInvoiceChange("companyVatNumber", e.target.value)}
                      placeholder="t.ex. SE556123456701"
                      className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="companyDetails">Övrigt (valfritt)</Label>
                  <Textarea
                    id="companyDetails"
                    value={invoiceData.companyDetails}
                    onChange={(e) => handleInvoiceChange("companyDetails", e.target.value)}
                    placeholder="Övriga företagsuppgifter"
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-zinc-400">Avsändare</p>
                <div>
                  <Label htmlFor="fromName">Namn</Label>
                  <Input
                    id="fromName"
                    value={invoiceData.fromName}
                    onChange={(e) => handleInvoiceChange("fromName", e.target.value)}
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <Label htmlFor="fromEmail">E-post</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={invoiceData.fromEmail}
                    onChange={(e) => handleInvoiceChange("fromEmail", e.target.value)}
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <Label htmlFor="fromAddress">Adress</Label>
                  <Input
                    id="fromAddress"
                    value={invoiceData.fromAddress}
                    onChange={(e) => handleInvoiceChange("fromAddress", e.target.value)}
                    placeholder="Gatuadress"
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="fromPostalCode">Postnummer</Label>
                    <Input
                      id="fromPostalCode"
                      value={invoiceData.fromPostalCode ?? ""}
                      onChange={(e) => handleInvoiceChange("fromPostalCode", e.target.value)}
                      placeholder="t.ex. 111 22"
                      className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromCity">Stad</Label>
                    <Input
                      id="fromCity"
                      value={invoiceData.fromCity ?? ""}
                      onChange={(e) => handleInvoiceChange("fromCity", e.target.value)}
                      placeholder="t.ex. Stockholm"
                      className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="fromCountry">Land</Label>
                  <Input
                    id="fromCountry"
                    value={invoiceData.fromCountry ?? ""}
                    onChange={(e) => handleInvoiceChange("fromCountry", e.target.value)}
                    placeholder="t.ex. Sverige"
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
            </div>
          </div>
        </div>
      </InvoiceEditSection>
        </div>
        <div className="min-w-0 space-y-6">
      <InvoiceEditSection
        title="Kund (fakturera till)"
        description="Faktureringsadress och kontaktuppgifter."
      >
          {onSelectRecipient && (
            <div className="mb-4 rounded-lg border border-border bg-muted/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <Label className="text-sm font-medium text-foreground dark:text-zinc-100">
                Välj företag för att fylla i uppgifterna nedan
              </Label>
              <Select
                value={selectedRecipientId ?? "__none__"}
                onValueChange={(id) => {
                  if (!id || id === "__none__") onSelectRecipient(null);
                  else onSelectRecipient(id);
                }}
              >
                <SelectTrigger className="mt-2 w-full border-input bg-background dark:border-zinc-700 dark:bg-zinc-900">
                  <SelectValue placeholder="Välj företag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Välj företag —</SelectItem>
                  {recipients.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.company_name || r.contact_name || r.email || r.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {recipients.length === 0 && (
                <p className="text-xs text-muted-foreground dark:text-zinc-400 mt-2">
                  Lägg till företag under Admin → Användare → Business, sedan visas de här.
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="toName">Namn</Label>
              <Input
                id="toName"
                value={invoiceData.toName}
                onChange={(e) => handleInvoiceChange("toName", e.target.value)}
                className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <Label htmlFor="toEmail">E-post</Label>
              <Input
                id="toEmail"
                type="email"
                value={invoiceData.toEmail}
                onChange={(e) => handleInvoiceChange("toEmail", e.target.value)}
                className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="toAddress">Adress</Label>
              <Input
                id="toAddress"
                value={invoiceData.toAddress}
                onChange={(e) => handleInvoiceChange("toAddress", e.target.value)}
                placeholder="Gatuadress"
                className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <Label htmlFor="toPostalCode">Postnummer</Label>
              <Input
                id="toPostalCode"
                value={invoiceData.toPostalCode ?? ""}
                onChange={(e) => handleInvoiceChange("toPostalCode", e.target.value)}
                placeholder="t.ex. 111 22"
                className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <Label htmlFor="toCity">Stad</Label>
              <Input
                id="toCity"
                value={invoiceData.toCity ?? ""}
                onChange={(e) => handleInvoiceChange("toCity", e.target.value)}
                placeholder="t.ex. Stockholm"
                className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="toCountry">Land</Label>
              <Input
                id="toCountry"
                value={invoiceData.toCountry ?? ""}
                onChange={(e) => handleInvoiceChange("toCountry", e.target.value)}
                placeholder="t.ex. Sverige"
                className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
      </InvoiceEditSection>

      <InvoiceEditSection
        title="Leveransadress"
        description="Valfritt om leveransen ska gå till annan adress än kund."
      >
          <div className="mb-1 flex items-center space-x-2">
            <Checkbox
              id="shipToSameAsBillTo"
              checked={Boolean(invoiceData.shipToSameAsBillTo)}
              onCheckedChange={(checked) =>
                handleInvoiceChange("shipToSameAsBillTo", checked === true)
              }
            />
            <Label htmlFor="shipToSameAsBillTo" className="cursor-pointer text-sm font-normal">
              Använd samma adress som kund (fakturaadress)
            </Label>
          </div>
          {!invoiceData.shipToSameAsBillTo && (
            <>
              <p className="mb-3 text-sm text-muted-foreground dark:text-zinc-400">Lämna tomt om samma som kund ovan.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="shipToName">Namn</Label>
                  <Input
                    id="shipToName"
                    value={invoiceData.shipToName ?? ""}
                    onChange={(e) => handleInvoiceChange("shipToName", e.target.value)}
                    placeholder="Mottagarens namn"
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="shipToAddress">Adress</Label>
                  <Input
                    id="shipToAddress"
                    value={invoiceData.shipToAddress ?? ""}
                    onChange={(e) => handleInvoiceChange("shipToAddress", e.target.value)}
                    placeholder="Gatuadress"
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <Label htmlFor="shipToPostalCode">Postnummer</Label>
                  <Input
                    id="shipToPostalCode"
                    value={invoiceData.shipToPostalCode ?? ""}
                    onChange={(e) => handleInvoiceChange("shipToPostalCode", e.target.value)}
                    placeholder="t.ex. 111 22"
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <Label htmlFor="shipToCity">Stad</Label>
                  <Input
                    id="shipToCity"
                    value={invoiceData.shipToCity ?? ""}
                    onChange={(e) => handleInvoiceChange("shipToCity", e.target.value)}
                    placeholder="t.ex. Stockholm"
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="shipToCountry">Land</Label>
                  <Input
                    id="shipToCountry"
                    value={invoiceData.shipToCountry ?? ""}
                    onChange={(e) => handleInvoiceChange("shipToCountry", e.target.value)}
                    placeholder="t.ex. Sverige"
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </>
          )}
      </InvoiceEditSection>
        </div>
      </div>

      <InvoiceEditSection title="Betalning" description="Bankgiro/plusgiro, referens och betalningsvillkor.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="clearingNumber">Clearingnummer</Label>
              <Input
                id="clearingNumber"
                value={invoiceData.clearingNumber ?? ""}
                onChange={(e) => handleInvoiceChange("clearingNumber", e.target.value)}
                placeholder="t.ex. 123-4"
                className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">Kontonummer</Label>
              <Input
                id="accountNumber"
                value={invoiceData.accountNumber ?? ""}
                onChange={(e) => handleInvoiceChange("accountNumber", e.target.value)}
                placeholder="Kontonummer"
                className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <Label htmlFor="reference">Betalningsreferens</Label>
              <Input
                id="reference"
                value={invoiceData.reference ?? ""}
                onChange={(e) => handleInvoiceChange("reference", e.target.value)}
                placeholder="OCR / meddelande"
                className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <Label htmlFor="paymentTerms">Betalningsvillkor</Label>
              <Input
                id="paymentTerms"
                value={invoiceData.paymentTerms ?? ""}
                onChange={(e) => handleInvoiceChange("paymentTerms", e.target.value)}
                placeholder="t.ex. 30 dagar netto"
                className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
      </InvoiceEditSection>

      <InvoiceEditSection title="Rader & summering" description="Lägg till vin från lager eller rader manuellt.">
        {addItemFromWine && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="invoice-wines-b2b-only"
                checked={winesB2bStockOnly}
                onCheckedChange={(v) => setWinesB2bStockOnly(v === true)}
              />
              <Label htmlFor="invoice-wines-b2b-only" className="text-sm font-normal cursor-pointer">
                Endast viner i B2B-lager
              </Label>
            </div>
            <Popover modal={false} open={winePopoverOpen} onOpenChange={setWinePopoverOpen}>
                <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={winesLoading}
                  className="h-9 rounded-lg border-input bg-background text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <Wine className="mr-2 h-4 w-4" />
                  {winesLoading ? "Laddar viner..." : "Lägg till vin"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[360px] max-h-[min(90vh,720px)] p-0 flex flex-col overflow-hidden dark:border-zinc-700 dark:bg-zinc-900"
                align="start"
                onWheel={(e) => e.stopPropagation()}
              >
                <Command className="h-auto max-h-[min(90vh,720px)] min-h-0 flex flex-col overflow-hidden rounded-md bg-popover text-popover-foreground dark:bg-zinc-900 dark:text-zinc-100">
                  <CommandInput placeholder="Sök vin..." />
                  <CommandList
                    className="max-h-[min(calc(90vh-7rem),600px)] min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <CommandEmpty>Inga viner hittades.</CommandEmpty>
                    <CommandGroup heading="Välj vin att lägga till">
                      {wines.map((wine) => {
                        const label = [wine.wine_name, wine.vintage].filter(Boolean).join(" ");
                        const producer = wine.producers?.name ?? "";
                        const warehousePrice = wine.b2b_price_excl_vat ?? null;
                        const fallbackPrice = Number(wine.base_price_cents ?? 0) / 100;
                        const price = warehousePrice ?? fallbackPrice;
                        return (
                          <CommandItem
                            key={wine.id}
                            value={`${label} ${producer} ${wine.id}`.toLowerCase()}
                            onSelect={() => handleSelectWine(wine)}
                          >
                            <span className="flex-1 truncate">
                              {label}
                              {producer && <span className="text-muted-foreground dark:text-zinc-400"> – {producer}</span>}
                            </span>
                            <span className="shrink-0 text-sm text-muted-foreground dark:text-zinc-400 ml-2">
                              {price > 0 ? `${Math.round(price)} kr exkl. moms` : "–"}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <span className="text-sm text-muted-foreground dark:text-zinc-400">eller</span>
          </div>
        )}
        <div className="space-y-4">
          {invoiceData.items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border bg-muted/30 p-4 dark:border-zinc-700 dark:bg-[#1C1C1F]"
            >
              <div className="mb-4">
                <Label htmlFor={`description-${item.id}`}>Beskrivning</Label>
                <Input
                  id={`description-${item.id}`}
                  value={item.description}
                  onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                  className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-12">
                <div className="sm:col-span-2">
                  <Label htmlFor={`quantity-${item.id}`}>Antal</Label>
                  <Input
                    id={`quantity-${item.id}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, "quantity", Number.parseInt(e.target.value) || 0)}
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor={`price-${item.id}`}>Á-pris</Label>
                  <Input
                    id={`price-${item.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => handleItemChange(item.id, "price", Number.parseFloat(e.target.value) || 0)}
                    className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor={`currency-${item.id}`}>Valuta</Label>
                  <Select value={item.currency} onValueChange={(value) => handleItemChange(item.id, "currency", value)}>
                    <SelectTrigger
                      id={`currency-${item.id}`}
                      className="border-input bg-background dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <SelectValue placeholder="Valuta" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {item.currency !== invoiceData.currency && (
                  <div className="sm:col-span-3">
                    <Label htmlFor={`exchangeRate-${item.id}`} className="flex items-center gap-1">
                      Växelkurs
                      <span className="whitespace-nowrap text-xs text-muted-foreground dark:text-zinc-400">
                        (1 {item.currency} = ? {invoiceData.currency})
                      </span>
                    </Label>
                    <Input
                      id={`exchangeRate-${item.id}`}
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={item.exchangeRate}
                      onChange={(e) =>
                        handleItemChange(item.id, "exchangeRate", Number.parseFloat(e.target.value) || 0)
                      }
                      className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                )}
                <div className="sm:col-span-1 flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    disabled={invoiceData.items.length === 0}
                    className="h-10 w-10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Label>Rabatt på rad</Label>
                <div className="mt-2">
                  <RadioGroup
                    value={item.discountType}
                    onValueChange={(value) =>
                      handleItemChange(item.id, "discountType", value as "percentage" | "amount")
                    }
                    className="mb-2 flex flex-wrap items-center gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="percentage" id={`percentage-${item.id}`} />
                      <Label htmlFor={`percentage-${item.id}`} className="cursor-pointer text-sm font-normal">
                        Procent (%)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="amount" id={`amount-${item.id}`} />
                      <Label htmlFor={`amount-${item.id}`} className="cursor-pointer text-sm font-normal">
                        Belopp
                      </Label>
                    </div>
                  </RadioGroup>
                  <Input
                    type="number"
                    min="0"
                    step={item.discountType === "percentage" ? "0.01" : "0.01"}
                    value={item.discountValue}
                    onChange={(e) => handleItemChange(item.id, "discountValue", Number.parseFloat(e.target.value) || 0)}
                    placeholder={item.discountType === "percentage" ? "%" : item.currency}
                    className="w-full border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-right text-sm text-muted-foreground dark:text-zinc-400 self-end">
                  {item.currency !== invoiceData.currency ? (
                    <>
                      {item.quantity} × {formatCurrency(item.price, item.currency)} ={" "}
                      {formatCurrency(item.quantity * item.price, item.currency)}
                      {item.discountValue > 0 && (
                        <>
                          <br />
                          <span className="font-medium text-foreground dark:text-zinc-100">
                            Rabatt: −{formatCurrency(calculateItemDiscount(item), item.currency)}
                          </span>
                        </>
                      )}
                      <br />
                      <span className="font-medium text-foreground dark:text-zinc-100">
                        {formatCurrency(calculateItemTotal(item), invoiceData.currency)}
                      </span>
                    </>
                  ) : (
                    <>
                      {item.quantity} × {formatCurrency(item.price, item.currency)} ={" "}
                      {formatCurrency(item.quantity * item.price, item.currency)}
                      {item.discountValue > 0 && (
                        <>
                          <br />
                          <span className="font-medium text-foreground dark:text-zinc-100">
                            Rabatt: −{formatCurrency(calculateItemDiscount(item), item.currency)}
                          </span>
                        </>
                      )}
                      <br />
                      <span className="font-medium text-foreground dark:text-zinc-100">
                        {formatCurrency(calculateItemTotal(item), invoiceData.currency)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addItem}
            className="mt-2 flex h-9 items-center rounded-lg border-input bg-background text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <Plus className="mr-2 h-4 w-4" /> Lägg till rad manuellt
          </Button>

          <div className="mt-6 border-t border-border pt-5 dark:border-zinc-700">
            <div className="ml-auto flex max-w-sm flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/80">
              <div className="flex justify-between gap-4 text-muted-foreground dark:text-zinc-400">
                <span>Delsumma</span>
                <span className="min-w-[100px] text-right tabular-nums text-foreground dark:text-zinc-100">
                  {formatCurrency(calculateSubtotal(), invoiceData.currency)}
                </span>
              </div>

              {calculateTotalItemDiscounts() > 0 && (
                <div className="flex justify-between gap-4 font-medium text-foreground dark:text-zinc-100">
                  <span>Rabatt (rader)</span>
                  <span className="min-w-[100px] text-right tabular-nums">
                    −{formatCurrency(calculateTotalItemDiscounts(), invoiceData.currency)}
                  </span>
                </div>
              )}

              {invoiceData.discountValue > 0 && (
                <div className="flex justify-between gap-4 font-medium text-foreground dark:text-zinc-100">
                  <span>
                    Fakturarabatt{" "}
                    {invoiceData.discountType === "percentage" ? `(${invoiceData.discountValue}%)` : ""}
                    {!invoiceData.applyInvoiceDiscountToDiscountedItems && (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground dark:text-zinc-400">
                        (endast rader utan rabatt)
                      </span>
                    )}
                  </span>
                  <span className="min-w-[100px] text-right tabular-nums">
                    −{formatCurrency(calculateDiscount(), invoiceData.currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-4 text-muted-foreground dark:text-zinc-400">
                <span>Moms ({invoiceData.taxRate}%)</span>
                <span className="min-w-[100px] text-right tabular-nums text-foreground dark:text-zinc-100">
                  {formatCurrency(calculateTax(), invoiceData.currency)}
                </span>
              </div>
              <div className="mt-1 flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold text-foreground dark:border-zinc-700 dark:text-zinc-100">
                <span>Totalt</span>
                <span className="min-w-[100px] text-right tabular-nums">
                  {formatCurrency(calculateTotal(), invoiceData.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </InvoiceEditSection>

      <InvoiceEditSection title="Anteckningar & sidfot" description="Visas på fakturan enligt mall.">
        <div className="space-y-4">
          <div>
            <Label htmlFor="notes">Anteckningar</Label>
            <Textarea
              id="notes"
              value={invoiceData.notes}
              onChange={(e) => handleInvoiceChange("notes", e.target.value)}
              placeholder="t.ex. leveransvillkor, extra information"
              className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
            />
          </div>
          <div>
            <Label htmlFor="footer">Sidfot</Label>
            <Textarea
              id="footer"
              value={invoiceData.footer}
              onChange={(e) => handleInvoiceChange("footer", e.target.value)}
              placeholder="t.ex. tacktext, webbadress, organisationsinfo"
              className="border-input bg-background text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
            />
          </div>
        </div>
      </InvoiceEditSection>
    </div>
  );
}
