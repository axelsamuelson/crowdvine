import type { InvoiceData } from "@/types/invoice";

type LineItem = InvoiceData["items"][0];

function calculateItemDiscount(item: LineItem): number {
  const itemSubtotal = item.quantity * item.price;
  if (item.discountValue <= 0) return 0;
  if (item.discountType === "percentage") {
    return itemSubtotal * (item.discountValue / 100);
  }
  return Math.min(item.discountValue, itemSubtotal);
}

function calculateItemTotal(item: LineItem, invoiceCurrency: string): number {
  const itemSubtotal = item.quantity * item.price;
  const itemDiscount = calculateItemDiscount(item);
  const itemNetTotal = itemSubtotal - itemDiscount;
  return item.currency === invoiceCurrency ? itemNetTotal : itemNetTotal * item.exchangeRate;
}

function calculateSubtotal(data: InvoiceData): number {
  return data.items.reduce((sum, item) => sum + calculateItemTotal(item, data.currency), 0);
}

function calculateTotalItemDiscounts(data: InvoiceData): number {
  return data.items.reduce((sum, item) => {
    const itemDiscount = calculateItemDiscount(item);
    return sum + (item.currency === data.currency ? itemDiscount : itemDiscount * item.exchangeRate);
  }, 0);
}

function calculateInvoiceDiscount(data: InvoiceData): number {
  if (data.discountValue <= 0) return 0;
  let discountableAmount = 0;
  if (data.applyInvoiceDiscountToDiscountedItems) {
    discountableAmount = calculateSubtotal(data);
  } else {
    discountableAmount = data.items.reduce((sum, item) => {
      if (item.discountValue > 0) return sum;
      const itemTotal = item.quantity * item.price;
      return sum + (item.currency === data.currency ? itemTotal : itemTotal * item.exchangeRate);
    }, 0);
  }
  if (data.discountType === "percentage") {
    return discountableAmount * (data.discountValue / 100);
  }
  return Math.min(data.discountValue, discountableAmount);
}

function calculateTaxableAmount(data: InvoiceData): number {
  return calculateSubtotal(data) - calculateInvoiceDiscount(data);
}

function calculateShipping(data: InvoiceData): number {
  return Number(data.shippingHandlingAmount) || 0;
}

function calculateTotalExclVat(data: InvoiceData): number {
  return calculateTaxableAmount(data) + calculateShipping(data);
}

function calculateTax(data: InvoiceData): number {
  return calculateTotalExclVat(data) * (data.taxRate / 100);
}

/** Grand total in invoice main currency (same as invoice preview / generator). */
export function computeInvoiceGrandTotal(data: InvoiceData): number {
  return calculateTotalExclVat(data) + calculateTax(data);
}
