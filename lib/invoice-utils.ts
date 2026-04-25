export function formatCurrency(amount: number, currency = "SEK"): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Swedish VAT (moms) rates commonly used on invoices; pick one in the admin invoice form. */
export const INVOICE_VAT_RATE_OPTIONS: readonly { rate: number; label: string }[] = [
  { rate: 25, label: "25% – normalskatt (varor och tjänster)" },
  { rate: 12, label: "12% – nedsatt moms" },
  { rate: 6, label: "6% – vidare nedsatt moms" },
  { rate: 0, label: "0% – momsfri / befriad / export m.m." },
];

/** Options for the invoice momssats dropdown; keeps a non-standard saved rate visible when loading a draft. */
export function getInvoiceVatRateSelectOptions(currentRate: number): { rate: number; label: string }[] {
  const standardRates = new Set(INVOICE_VAT_RATE_OPTIONS.map((o) => o.rate));
  const normalized =
    typeof currentRate === "number" && !Number.isNaN(currentRate)
      ? Math.round(currentRate * 1000) / 1000
      : 0;
  const extra =
    !standardRates.has(normalized) && normalized >= 0 && normalized <= 100
      ? [{ rate: normalized, label: `${normalized}% (sparad anpassad sats)` }]
      : [];
  return [...extra, ...INVOICE_VAT_RATE_OPTIONS];
}

export const currencies = [
  { code: "SEK", name: "Svensk krona" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "LKR", name: "Sri Lankan Rupee" },
];
