"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InvoiceForm } from "@/components/admin/invoice-form";
import { InvoicePreview } from "@/components/admin/invoice-preview";
import type { InvoiceData } from "@/types/invoice";
import {
  getInvoiceDrafts,
  getInvoiceDraft,
  saveInvoiceDraft,
  deleteInvoiceDraft,
  type InvoiceDraftMeta,
} from "@/lib/invoice-drafts";
import { FileDown, FileUp, FilePlus2, ChevronDown, Trash2, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { computeInvoiceGrandTotal } from "@/lib/invoice-total";
import type { InvoiceRecipient } from "@/app/api/admin/invoice-recipients/route";
import type { InvoiceSenderDefaults } from "@/app/api/admin/invoice-sender-defaults/route";

type SenderDefaultsFields = Pick<
  InvoiceData,
  | "companyName"
  | "companyLogo"
  | "companyDetails"
  | "companyOrgNumber"
  | "companyVatNumber"
  | "fromName"
  | "fromEmail"
  | "fromAddress"
  | "fromPostalCode"
  | "fromCity"
  | "fromCountry"
  | "clearingNumber"
  | "accountNumber"
  | "paymentTerms"
  | "footer"
>;

function applySenderDefaultsToInvoice(defaults: InvoiceSenderDefaults | null): Partial<SenderDefaultsFields> {
  if (!defaults) return {};
  return {
    companyName: defaults.company_name ?? "",
    companyLogo: defaults.company_logo ?? "",
    companyDetails: defaults.company_details ?? "",
    companyOrgNumber: defaults.org_number ?? "",
    companyVatNumber: defaults.vat_number ?? "",
    fromName: defaults.from_name ?? "",
    fromEmail: defaults.from_email ?? "",
    fromAddress: defaults.from_address ?? "",
    fromPostalCode: defaults.from_postal_code ?? "",
    fromCity: defaults.from_city ?? "",
    fromCountry: defaults.from_country ?? "",
    clearingNumber: defaults.clearing_number ?? "",
    accountNumber: defaults.account_number ?? "",
    paymentTerms: defaults.payment_terms ?? "",
    footer: defaults.default_footer || "Thank you for your business!",
  };
}

interface InvoiceGeneratorProps {
  /** After a manual invoice is saved as an offline order, parent can switch tab / refetch. */
  onOfflineOrderCreated?: () => void;
  /** Pre-fill form when opening an existing DB order (Dirty Wine). */
  initialInvoice?: InvoiceData;
  /** When set, "Spara som order" PATCHes this row instead of POSTing a new one. */
  offlineOrderId?: string;
  /** Called after a successful PATCH to an existing offline order. */
  onOrderUpdated?: () => void;
}

export default function InvoiceGenerator(props?: InvoiceGeneratorProps) {
  const { onOfflineOrderCreated, initialInvoice, offlineOrderId, onOrderUpdated } = props ?? {};
  const [activeTab, setActiveTab] = useState("edit");
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [senderDefaults, setSenderDefaults] = useState<InvoiceSenderDefaults | null>(null);

  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    companyName: "",
    companyLogo: "",
    companyDetails: "",
    fromName: "",
    fromEmail: "",
    fromAddress: "",
    fromPostalCode: "",
    fromCity: "",
    fromCountry: "",
    toName: "",
    toEmail: "",
    toAddress: "",
    toPostalCode: "",
    toCity: "",
    toCountry: "",
    shipToSameAsBillTo: false,
    shipToName: "",
    shipToAddress: "",
    shipToPostalCode: "",
    shipToCity: "",
    shipToCountry: "",
    clearingNumber: "",
    accountNumber: "",
    reference: "",
    paymentTerms: "",
    shippingHandlingAmount: 0,
    items: [],
    notes: "",
    taxRate: 25,
    currency: "SEK",
    footer: "Thank you for your business!",
    discountType: "percentage",
    discountValue: 0,
    applyInvoiceDiscountToDiscountedItems: true,
  });

  const [draftId, setDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<InvoiceDraftMeta[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [dirtyWineLogoUrl, setDirtyWineLogoUrl] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<InvoiceRecipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/invoice-recipients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRecipients(Array.isArray(data) ? data : []))
      .catch(() => setRecipients([]));
  }, []);

  useEffect(() => {
    fetch("/api/admin/invoice-sender-defaults")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSenderDefaults(data))
      .catch(() => setSenderDefaults(null));
  }, []);

  useEffect(() => {
    if (!senderDefaults) return;
    setInvoiceData((prev) => {
      if (prev.companyName !== "" || prev.fromName !== "") return prev;
      const applied = applySenderDefaultsToInvoice(senderDefaults);
      return { ...prev, ...applied };
    });
  }, [senderDefaults]);

  useEffect(() => {
    if (!initialInvoice) return;
    setInvoiceData(initialInvoice);
    setDraftId(null);
    setSelectedRecipientId(null);
    setActiveTab("edit");
  }, [initialInvoice]);

  const applyRecipient = (r: InvoiceRecipient) => {
    const toName = [r.company_name, r.contact_name].filter(Boolean).join(" – ") || "";
    setInvoiceData((prev) => ({
      ...prev,
      toName: toName || prev.toName,
      toEmail: r.email || prev.toEmail,
      toAddress: r.address || prev.toAddress,
      toPostalCode: r.postal_code ?? prev.toPostalCode,
      toCity: r.city ?? prev.toCity,
      toCountry: prev.toCountry || "",
    }));
    setSelectedRecipientId(r.id);
  };

  useEffect(() => {
    fetch("/api/site-content/header_logo_dirtywine", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const url = data?.value?.trim();
        if (url && url !== "null") setDirtyWineLogoUrl(url);
      })
      .catch(() => {});
  }, []);

  const refreshDrafts = useCallback(() => {
    setDrafts(getInvoiceDrafts());
  }, []);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  const handleSaveDraft = () => {
    const id = saveInvoiceDraft(invoiceData, draftId ?? undefined);
    setDraftId(id);
    refreshDrafts();
  };

  const handleSaveAsOfflineOrder = async () => {
    if (!invoiceData.invoiceNumber?.trim()) {
      toast.error("Ange fakturanummer.");
      return;
    }
    if (!invoiceData.items?.length) {
      toast.error("Lägg till minst en fakturarad.");
      return;
    }
    if (!invoiceData.toName?.trim() && !invoiceData.toEmail?.trim()) {
      toast.error("Fyll i kundnamn eller e-post under Kund (fakturera till).");
      return;
    }
    setSavingOrder(true);
    try {
      const isUpdate = Boolean(offlineOrderId);
      const res = await fetch(
        isUpdate
          ? `/api/admin/bookings/dirty-wine-orders/${offlineOrderId}`
          : "/api/admin/bookings/dirty-wine-orders",
        {
          method: isUpdate ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoice: invoiceData }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Kunde inte spara order.");
        return;
      }
      if (isUpdate) {
        toast.success("Order uppdaterad.");
        onOrderUpdated?.();
      } else {
        toast.success("Order sparad som offline (manuell faktura).");
        onOfflineOrderCreated?.();
      }
    } catch {
      toast.error("Nätverksfel – försök igen.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleLoadDraft = (id: string) => {
    const data = getInvoiceDraft(id);
    if (data) {
      setInvoiceData(data);
      setDraftId(id);
    }
  };

  const handleNewInvoice = () => {
    const applied = applySenderDefaultsToInvoice(senderDefaults);
    setInvoiceData({
      invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      companyName: applied.companyName ?? "",
      companyLogo: applied.companyLogo ?? "",
      companyDetails: applied.companyDetails ?? "",
      companyOrgNumber: applied.companyOrgNumber ?? "",
      companyVatNumber: applied.companyVatNumber ?? "",
      fromName: applied.fromName ?? "",
      fromEmail: applied.fromEmail ?? "",
      fromAddress: applied.fromAddress ?? "",
      fromPostalCode: applied.fromPostalCode ?? "",
      fromCity: applied.fromCity ?? "",
      fromCountry: applied.fromCountry ?? "",
      toName: "",
      toEmail: "",
      toAddress: "",
      toPostalCode: "",
      toCity: "",
      toCountry: "",
      shipToSameAsBillTo: false,
      shipToName: "",
      shipToAddress: "",
      shipToPostalCode: "",
      shipToCity: "",
      shipToCountry: "",
      clearingNumber: applied.clearingNumber ?? "",
      accountNumber: applied.accountNumber ?? "",
      reference: "",
      paymentTerms: applied.paymentTerms ?? "",
      shippingHandlingAmount: 0,
      items: [],
      notes: "",
      taxRate: 25,
      currency: "SEK",
      footer: applied.footer ?? "Thank you for your business!",
      discountType: "percentage",
      discountValue: 0,
      applyInvoiceDiscountToDiscountedItems: true,
    });
    setDraftId(null);
    setSelectedRecipientId(null);
  };

  const handleDeleteDraft = (id: string) => {
    deleteInvoiceDraft(id);
    if (draftId === id) {
      handleNewInvoice();
    }
    refreshDrafts();
  };

  const handleInvoiceChange = (field: string, value: string | number | boolean) => {
    if (field === "currency") {
      const updatedItems = invoiceData.items.map((item) => {
        if (item.currency === invoiceData.currency) {
          return { ...item, currency: String(value), exchangeRate: 1 };
        }
        return item;
      });
      setInvoiceData({ ...invoiceData, [field]: value, items: updatedItems } as InvoiceData);
    } else {
      setInvoiceData({ ...invoiceData, [field]: value } as InvoiceData);
    }
  };

  const handleItemChange = (id: string, field: string, value: string | number) => {
    const updatedItems = invoiceData.items.map((item) => {
      if (item.id === id) {
        if (field === "currency") {
          const exchangeRate = value === invoiceData.currency ? 1 : item.exchangeRate;
          return { ...item, currency: String(value), exchangeRate };
        }

        if (field === "quantity" || field === "price" || field === "exchangeRate" || field === "discountValue") {
          return { ...item, [field]: Number(value) || 0 };
        }

        return { ...item, [field]: value };
      }
      return item;
    });
    setInvoiceData({ ...invoiceData, items: updatedItems });
  };

  const addItem = () => {
    setInvoiceData({
      ...invoiceData,
      items: [
        ...invoiceData.items,
        {
          id: uuidv4(),
          description: "",
          quantity: 1,
          price: 0,
          currency: invoiceData.currency,
          exchangeRate: 1,
          discountType: "percentage",
          discountValue: 0,
        },
      ],
    });
  };

  /** Add a line item from a selected wine. Uses warehouse (B2B) price exkl. moms by default, same as tasting summary / dirtywine.se. */
  const addItemFromWine = (wine: {
    wine_name: string;
    vintage: string;
    producers?: { name?: string } | null;
    base_price_cents?: number | null;
    b2b_price_excl_vat?: number | null;
  }) => {
    const producerName = wine.producers?.name;
    const description = [wine.wine_name, wine.vintage].filter(Boolean).join(" ") +
      (producerName ? ` – ${producerName}` : "");
    const warehousePrice = wine.b2b_price_excl_vat ?? null;
    const price = warehousePrice ?? (wine.base_price_cents ?? 0) / 100;
    setInvoiceData({
      ...invoiceData,
      items: [
        ...invoiceData.items,
        {
          id: uuidv4(),
          description,
          quantity: 6,
          price: Math.round(price * 100) / 100,
          currency: invoiceData.currency,
          exchangeRate: 1,
          discountType: "percentage",
          discountValue: 0,
        },
      ],
    });
  };

  const removeItem = (id: string) => {
    setInvoiceData({
      ...invoiceData,
      items: invoiceData.items.filter((item) => item.id !== id),
    });
  };

  const calculateItemDiscount = (item: (typeof invoiceData.items)[0]) => {
    const itemSubtotal = item.quantity * item.price;
    if (item.discountValue <= 0) return 0;

    if (item.discountType === "percentage") {
      return itemSubtotal * (item.discountValue / 100);
    } else {
      return Math.min(item.discountValue, itemSubtotal);
    }
  };

  const calculateItemTotal = (item: (typeof invoiceData.items)[0]) => {
    const itemSubtotal = item.quantity * item.price;
    const itemDiscount = calculateItemDiscount(item);
    const itemNetTotal = itemSubtotal - itemDiscount;

    return item.currency === invoiceData.currency ? itemNetTotal : itemNetTotal * item.exchangeRate;
  };

  const calculateSubtotal = () => {
    return invoiceData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateTotalItemDiscounts = () => {
    return invoiceData.items.reduce((sum, item) => {
      const itemDiscount = calculateItemDiscount(item);
      return sum + (item.currency === invoiceData.currency ? itemDiscount : itemDiscount * item.exchangeRate);
    }, 0);
  };

  const calculateDiscount = () => {
    if (invoiceData.discountValue <= 0) return 0;

    let discountableAmount = 0;

    if (invoiceData.applyInvoiceDiscountToDiscountedItems) {
      discountableAmount = calculateSubtotal();
    } else {
      discountableAmount = invoiceData.items.reduce((sum, item) => {
        if (item.discountValue > 0) return sum;
        const itemTotal = item.quantity * item.price;
        return sum + (item.currency === invoiceData.currency ? itemTotal : itemTotal * item.exchangeRate);
      }, 0);
    }

    if (invoiceData.discountType === "percentage") {
      return discountableAmount * (invoiceData.discountValue / 100);
    } else {
      return Math.min(invoiceData.discountValue, discountableAmount);
    }
  };

  const calculateTaxableAmount = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const calculateShipping = () => {
    return Number(invoiceData.shippingHandlingAmount) || 0;
  };

  /** Total excl. VAT (after discount + shipping), used as base for VAT */
  const calculateTotalExclVAT = () => {
    return calculateTaxableAmount() + calculateShipping();
  };

  const calculateTax = () => {
    return calculateTotalExclVAT() * (invoiceData.taxRate / 100);
  };

  const calculateTotal = () => computeInvoiceGrandTotal(invoiceData);

  const downloadPdf = async () => {
    if (invoiceRef.current) {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`invoice-${invoiceData.invoiceNumber}.pdf`);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoiceData({
          ...invoiceData,
          companyLogo: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectRecipient = (id: string | null) => {
    if (!id) {
      setSelectedRecipientId(null);
      return;
    }
    const r = recipients.find((x) => x.id === id);
    if (r) applyRecipient(r);
  };

  const invoiceToolbarBtn =
    "h-9 shrink-0 gap-2 rounded-lg px-3.5 text-xs font-medium [&_svg]:size-4 [&_svg]:shrink-0";

  return (
    <div className="w-full max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div
          className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/50 p-1 shadow-sm dark:border-zinc-700 dark:bg-[#1C1C1F]"
          role="group"
          aria-label="Utkast"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  invoiceToolbarBtn,
                  "border-border bg-background shadow-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
                )}
              >
                <FileUp className="opacity-90" aria-hidden />
                Öppna utkast
                <ChevronDown className="opacity-70" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-72 max-h-[280px] overflow-y-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {drafts.length === 0 ? (
              <div className="py-4 px-3 text-center text-sm text-muted-foreground dark:text-zinc-400">
                Inga sparade utkast
              </div>
            ) : (
              drafts.map((d) => (
                <div key={d.id} className="flex items-center gap-0">
                  <DropdownMenuItem
                    onClick={() => handleLoadDraft(d.id)}
                    className="flex-1 min-w-0"
                  >
                    <span className="truncate">{d.name}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="w-8 p-0 justify-center text-muted-foreground hover:text-destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      handleDeleteDraft(d.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </DropdownMenuItem>
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            className={cn(
              invoiceToolbarBtn,
              "border-border bg-background shadow-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
            )}
          >
            <FileDown className="opacity-90" aria-hidden />
            {draftId ? "Uppdatera utkast" : "Spara som utkast"}
          </Button>
        </div>

        <Button
          type="button"
          variant="default"
          onClick={handleSaveAsOfflineOrder}
          disabled={savingOrder}
          className={cn(
            invoiceToolbarBtn,
            "border border-primary/30 bg-primary/25 px-4 font-semibold text-primary shadow-sm ring-1 ring-border/20",
            "hover:bg-primary/35 hover:shadow-md disabled:opacity-60",
            "dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700/50 dark:hover:bg-zinc-700",
          )}
        >
          <ClipboardList aria-hidden />
          {savingOrder ? "Sparar…" : offlineOrderId ? "Uppdatera order" : "Spara som order"}
          {!offlineOrderId ? (
            <span className="hidden font-normal opacity-80 sm:inline">(offline)</span>
          ) : null}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={handleNewInvoice}
          className={cn(
            invoiceToolbarBtn,
            "px-3 text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
          )}
        >
          <FilePlus2 aria-hidden />
          Ny faktura
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl border border-border bg-muted p-1 text-muted-foreground dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-400">
          <TabsTrigger
            value="edit"
            className="rounded-lg text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:text-zinc-400 dark:data-[state=active]:bg-[#1C1C1F] dark:data-[state=active]:text-zinc-100 dark:data-[state=active]:shadow-sm"
          >
            Redigera faktura
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="rounded-lg text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:text-zinc-400 dark:data-[state=active]:bg-[#1C1C1F] dark:data-[state=active]:text-zinc-100 dark:data-[state=active]:shadow-sm"
          >
            Förhandsgranska
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-6">
          <InvoiceForm
            invoiceData={invoiceData}
            handleInvoiceChange={handleInvoiceChange}
            handleItemChange={handleItemChange}
            handleLogoUpload={handleLogoUpload}
            addItem={addItem}
            addItemFromWine={addItemFromWine}
            recipients={recipients}
            selectedRecipientId={selectedRecipientId}
            onSelectRecipient={handleSelectRecipient}
            removeItem={removeItem}
            calculateItemDiscount={calculateItemDiscount}
            calculateItemTotal={calculateItemTotal}
            calculateTotalItemDiscounts={calculateTotalItemDiscounts}
            calculateSubtotal={calculateSubtotal}
            calculateDiscount={calculateDiscount}
            calculateTaxableAmount={calculateTaxableAmount}
            calculateTax={calculateTax}
            calculateTotal={calculateTotal}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <Card className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm dark:border-zinc-700 dark:bg-[#1C1C1F] dark:text-zinc-100">
            <div ref={invoiceRef}>
              <InvoicePreview
                invoiceData={invoiceData}
                dirtyWineLogoUrl={dirtyWineLogoUrl}
                calculateItemDiscount={calculateItemDiscount}
                calculateItemTotal={calculateItemTotal}
                calculateTotalItemDiscounts={calculateTotalItemDiscounts}
                calculateSubtotal={calculateSubtotal}
                calculateDiscount={calculateDiscount}
                calculateTaxableAmount={calculateTaxableAmount}
                calculateShipping={calculateShipping}
                calculateTotalExclVAT={calculateTotalExclVAT}
                calculateTax={calculateTax}
                calculateTotal={calculateTotal}
              />
            </div>
            <div className="mt-6 flex justify-end border-t border-border pt-6 dark:border-zinc-700">
              <Button onClick={downloadPdf} className="h-9 rounded-lg text-xs font-medium">
                Ladda ner PDF
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
