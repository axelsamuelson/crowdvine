export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  currency: string;
  exchangeRate: number;
  discountType: "percentage" | "amount";
  discountValue: number;
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
  /** Ship To (leveransadress), optional. If shipToSameAsBillTo is true, use Bill To address in preview. */
  shipToSameAsBillTo?: boolean;
  shipToName?: string;
  shipToAddress?: string;
  shipToPostalCode?: string;
  shipToCity?: string;
  shipToCountry?: string;
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
}
