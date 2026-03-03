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
import { FileDown, FileUp, FilePlus2, ChevronDown, Trash2 } from "lucide-react";
import type { InvoiceRecipient } from "@/app/api/admin/invoice-recipients/route";
import type { InvoiceSenderDefaults } from "@/app/api/admin/invoice-sender-defaults/route";

function applySenderDefaultsToInvoice(
  defaults: InvoiceSenderDefaults | null,
): Pick<
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
> {
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

export default function InvoiceGenerator() {
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
    taxRate: 0,
    currency: "SEK",
    footer: "Thank you for your business!",
    discountType: "percentage",
    discountValue: 0,
    applyInvoiceDiscountToDiscountedItems: true,
  });

  const [draftId, setDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<InvoiceDraftMeta[]>([]);
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
      taxRate: 0,
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
      setInvoiceData({ ...invoiceData, [field]: value, items: updatedItems });
    } else {
      setInvoiceData({ ...invoiceData, [field]: value });
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

  /** Add a line item from a selected wine (admin wines list). */
  const addItemFromWine = (wine: {
    wine_name: string;
    vintage: string;
    producers?: { name?: string } | null;
    base_price_cents?: number | null;
  }) => {
    const producerName = wine.producers?.name;
    const description = [wine.wine_name, wine.vintage].filter(Boolean).join(" ") +
      (producerName ? ` – ${producerName}` : "");
    const price = (wine.base_price_cents || 0) / 100;
    setInvoiceData({
      ...invoiceData,
      items: [
        ...invoiceData.items,
        {
          id: uuidv4(),
          description,
          quantity: 1,
          price,
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

  const calculateTotal = () => {
    return calculateTotalExclVAT() + calculateTax();
  };

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FileUp className="h-4 w-4 mr-2" />
              Öppna utkast
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 max-h-[280px] overflow-y-auto">
            {drafts.length === 0 ? (
              <div className="py-4 px-3 text-sm text-muted-foreground text-center">
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
        <Button variant="outline" size="sm" onClick={handleSaveDraft}>
          <FileDown className="h-4 w-4 mr-2" />
          {draftId ? "Uppdatera utkast" : "Spara som utkast"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleNewInvoice}>
          <FilePlus2 className="h-4 w-4 mr-2" />
          Ny faktura
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="edit">Edit Invoice</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
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

        <TabsContent value="preview">
          <Card className="p-6">
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
            <div className="mt-6 flex justify-end">
              <Button onClick={downloadPdf}>Download PDF</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
