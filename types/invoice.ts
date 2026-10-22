export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  currency: string;
  exchangeRate: number;
  discountType: "percentage" | "amount";
  discountValue: number;
  /** Line total excl. VAT in öre, when the row comes from a saved invoice. */
  lineTotalOre?: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  companyName: string;
  companyLogo: string;
  companyDetails: string;
  companyOrgNumber?: string;
  companyVatNumber?: string;
  /** Punktskattenummer, shown under the VAT number. */
  companyExciseNumber?: string;
  fromName: string;
  fromEmail: string;
  fromAddress: string;
  fromPostalCode?: string;
  fromCity?: string;
  fromCountry?: string;
  /** Bill To (faktureringsadress) */
  toName: string;
  toEmail: string;
  toAddress: string;
  toPostalCode?: string;
  toCity?: string;
  toCountry?: string;
  /** Primary contact. Shown on the invoice only when set. */
  toContactName?: string;
  /** Ship To (leveransadress), optional. If shipToSameAsBillTo is true, use Bill To address in preview. */
  shipToSameAsBillTo?: boolean;
  shipToName?: string;
  shipToAddress?: string;
  shipToPostalCode?: string;
  shipToCity?: string;
  shipToCountry?: string;
  shipToContact?: string;
  items: LineItem[];
  notes: string;
  taxRate: number;
  currency: string;
  /** Payment information */
  clearingNumber?: string;
  accountNumber?: string;
  reference?: string;
  paymentTerms?: string;
  /** Shipping/Handling amount (in main currency) */
  shippingHandlingAmount?: number;
  footer: string;
  discountType: "percentage" | "amount";
  discountValue: number;
  applyInvoiceDiscountToDiscountedItems: boolean;
  /** When set, preview and PDF use these öre totals instead of float math. */
  amountsOre?: {
    subtotal: number;
    vat: number;
    total: number;
  };
}
