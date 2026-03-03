import type { InvoiceData } from "@/types/invoice";
import { formatCurrency, formatDate } from "@/lib/invoice-utils";

interface InvoicePreviewProps {
  invoiceData: InvoiceData;
  /** Optional Dirty Wine logo URL to show on the invoice (e.g. from site content). */
  dirtyWineLogoUrl?: string | null;
  calculateItemDiscount: (item: InvoiceData["items"][0]) => number;
  calculateItemTotal: (item: InvoiceData["items"][0]) => number;
  calculateTotalItemDiscounts: () => number;
  calculateSubtotal: () => number;
  calculateDiscount: () => number;
  calculateTaxableAmount: () => number;
  calculateShipping: () => number;
  calculateTotalExclVAT: () => number;
  calculateTax: () => number;
  calculateTotal: () => number;
}

export function InvoicePreview({
  invoiceData,
  dirtyWineLogoUrl,
  calculateItemDiscount,
  calculateItemTotal,
  calculateTotalItemDiscounts,
  calculateSubtotal,
  calculateDiscount,
  calculateTaxableAmount,
  calculateShipping,
  calculateTotalExclVAT,
  calculateTax,
  calculateTotal,
}: InvoicePreviewProps) {
  const showDirtyWineLogo = Boolean(dirtyWineLogoUrl?.trim());
  return (
    <div className="bg-white text-black p-8 min-h-[29.7cm] w-full">
      <div className="mb-8">
        {/* First row: Logo and Company Details */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            {showDirtyWineLogo && (
              <div className="h-14 relative flex-shrink-0" style={{ minWidth: "140px" }}>
                <img
                  src={dirtyWineLogoUrl!}
                  alt="Dirty Wine"
                  className="h-full w-full object-contain object-left"
                />
              </div>
            )}
            {invoiceData.companyLogo && (
              <div className="h-16 w-16 relative">
                <img
                  src={invoiceData.companyLogo || "/placeholder.svg"}
                  alt="Company Logo"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
          </div>
          <div className="text-right">
            {invoiceData.companyName && <p className="font-bold">{invoiceData.companyName}</p>}
            {(invoiceData.companyOrgNumber?.trim() || invoiceData.companyVatNumber?.trim() || invoiceData.companyDetails?.trim()) ? (
              <div className="text-sm text-black/70">
                {invoiceData.companyOrgNumber?.trim() && <p>Org.nr: {invoiceData.companyOrgNumber}</p>}
                {invoiceData.companyVatNumber?.trim() && <p>Momsreg.nr: {invoiceData.companyVatNumber}</p>}
                {invoiceData.companyDetails?.trim() && (
                  <p className="whitespace-pre-line">{invoiceData.companyDetails}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Separator line */}
        <div className="w-full h-px bg-gray-200 my-6"></div>

        {/* Second row: Faktura and Dates */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-1">Faktura</h1>
            <p className="text-black/70">Fakturanummer: {invoiceData.invoiceNumber}</p>
          </div>
          <div className="text-right text-sm">
            <p><span className="font-medium text-black/70">Datum:</span> {formatDate(invoiceData.date)}</p>
            <p><span className="font-medium text-black/70">Förfallodatum:</span> {formatDate(invoiceData.dueDate)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/70 mb-2">Från</h2>
          <div className="text-black/70">
            <p className="font-semibold">{invoiceData.fromName}</p>
            <p>{invoiceData.fromEmail}</p>
            {[invoiceData.fromPostalCode, invoiceData.fromCity, invoiceData.fromCountry].some((s) => s?.trim()) ? (
              <>
                {invoiceData.fromAddress?.trim() && <p>{invoiceData.fromAddress}</p>}
                {(invoiceData.fromPostalCode?.trim() || invoiceData.fromCity?.trim()) && (
                  <p>{[invoiceData.fromPostalCode, invoiceData.fromCity].filter(Boolean).join(" ")}</p>
                )}
                {invoiceData.fromCountry?.trim() && <p>{invoiceData.fromCountry}</p>}
              </>
            ) : (
              invoiceData.fromAddress?.trim() && <p className="whitespace-pre-line">{invoiceData.fromAddress}</p>
            )}
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/70 mb-2">Fakturera till (Bill To)</h2>
          <div className="text-black/70">
            <p className="font-semibold">{invoiceData.toName}</p>
            <p>{invoiceData.toEmail}</p>
            {[invoiceData.toPostalCode, invoiceData.toCity, invoiceData.toCountry].some((s) => s?.trim()) ? (
              <>
                {invoiceData.toAddress && <p>{invoiceData.toAddress}</p>}
                {(invoiceData.toPostalCode?.trim() || invoiceData.toCity?.trim()) && (
                  <p>{[invoiceData.toPostalCode, invoiceData.toCity].filter(Boolean).join(" ")}</p>
                )}
                {invoiceData.toCountry?.trim() && <p>{invoiceData.toCountry}</p>}
              </>
            ) : (
              invoiceData.toAddress && <p className="whitespace-pre-line">{invoiceData.toAddress}</p>
            )}
          </div>
        </div>
      </div>

      {(invoiceData.shipToSameAsBillTo ||
        invoiceData.shipToName?.trim() ||
        invoiceData.shipToAddress?.trim() ||
        invoiceData.shipToPostalCode?.trim() ||
        invoiceData.shipToCity?.trim() ||
        invoiceData.shipToCountry?.trim()) && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/70 mb-2">Leveransadress (Ship To)</h2>
          <div className="text-black/70">
            {invoiceData.shipToSameAsBillTo ? (
              <>
                {invoiceData.toName && <p className="font-semibold">{invoiceData.toName}</p>}
                {invoiceData.toAddress && <p>{invoiceData.toAddress}</p>}
                {(invoiceData.toPostalCode?.trim() || invoiceData.toCity?.trim()) && (
                  <p>{[invoiceData.toPostalCode, invoiceData.toCity].filter(Boolean).join(" ")}</p>
                )}
                {invoiceData.toCountry?.trim() && <p>{invoiceData.toCountry}</p>}
                <p className="text-xs text-black/50 mt-1">Samma som Bill To</p>
              </>
            ) : (
              <>
                {invoiceData.shipToName?.trim() && <p className="font-semibold">{invoiceData.shipToName}</p>}
                {invoiceData.shipToAddress?.trim() && <p>{invoiceData.shipToAddress}</p>}
                {(invoiceData.shipToPostalCode?.trim() || invoiceData.shipToCity?.trim()) && (
                  <p>{[invoiceData.shipToPostalCode, invoiceData.shipToCity].filter(Boolean).join(" ")}</p>
                )}
                {invoiceData.shipToCountry?.trim() && <p>{invoiceData.shipToCountry}</p>}
              </>
            )}
          </div>
        </div>
      )}

      {(invoiceData.clearingNumber?.trim() ||
        invoiceData.accountNumber?.trim() ||
        invoiceData.reference?.trim() ||
        invoiceData.paymentTerms?.trim()) && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/70 mb-3">Betalningsinformation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-black/90">
            {invoiceData.clearingNumber?.trim() && (
              <div>
                <span className="font-medium text-black/70">Clearingnummer:</span> {invoiceData.clearingNumber}
              </div>
            )}
            {invoiceData.accountNumber?.trim() && (
              <div>
                <span className="font-medium text-black/70">Kontonummer:</span> {invoiceData.accountNumber}
              </div>
            )}
            {invoiceData.reference?.trim() && (
              <div>
                <span className="font-medium text-black/70">Referens:</span> {invoiceData.reference}
              </div>
            )}
            {invoiceData.paymentTerms?.trim() && (
              <div>
                <span className="font-medium text-black/70">Betalningsvillkor:</span> {invoiceData.paymentTerms}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="py-2 text-left text-sm font-semibold text-black/80">Beskrivning</th>
              <th className="py-2 text-right text-sm font-semibold text-black/80">Antal</th>
              <th className="py-2 text-right text-sm font-semibold text-black/80">Pris</th>
              {invoiceData.items.some((item) => item.currency !== invoiceData.currency) && (
                <th className="py-2 text-right text-sm font-semibold text-black/80">Valuta</th>
              )}
              <th className="py-2 text-right text-sm font-semibold text-black/80">Rabatt</th>
              <th className="py-2 text-right text-sm font-semibold text-black/80">Belopp</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right">{formatCurrency(item.price, item.currency)}</td>
                {invoiceData.items.some((i) => i.currency !== invoiceData.currency) && (
                  <td className="py-3 text-right">
                    {item.currency}
                    {item.currency !== invoiceData.currency && (
                      <span className="text-xs text-black/50 block">Rate: {item.exchangeRate}</span>
                    )}
                  </td>
                )}
                <td className="py-3 text-right">
                  {item.discountValue > 0 ? (
                    <span className="text-black font-medium">
                      {item.discountType === "percentage"
                        ? `${item.discountValue}%`
                        : formatCurrency(item.discountValue, item.currency)}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="py-3 text-right">
                  {item.currency !== invoiceData.currency ? (
                    <>
                      <span className="text-xs text-black/50 block">
                        {formatCurrency(item.quantity * item.price - calculateItemDiscount(item), item.currency)}
                      </span>
                      {formatCurrency(calculateItemTotal(item), invoiceData.currency)}
                    </>
                  ) : (
                    formatCurrency(calculateItemTotal(item), invoiceData.currency)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-8">
        <div className="w-full sm:w-80 min-w-[240px]">
          <div className="flex justify-between py-2 text-sm">
            <span className="text-black/80">Total exkl. moms</span>
            <span>{formatCurrency(calculateSubtotal(), invoiceData.currency)}</span>
          </div>

          {(calculateTotalItemDiscounts() > 0 || calculateDiscount() > 0) && (
            <div className="flex justify-between py-2 text-sm text-black font-medium">
              <span>Rabatt</span>
              <span>
                -{formatCurrency(calculateTotalItemDiscounts() + calculateDiscount(), invoiceData.currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between py-2 text-sm">
            <span className="text-black/80">Total exkl. moms efter rabatt</span>
            <span>{formatCurrency(calculateTaxableAmount(), invoiceData.currency)}</span>
          </div>

          {calculateShipping() > 0 && (
            <div className="flex justify-between py-2 text-sm">
              <span className="text-black/80">Frakt / hantering</span>
              <span>{formatCurrency(calculateShipping(), invoiceData.currency)}</span>
            </div>
          )}

          <div className="flex justify-between py-2 text-sm">
            <span className="text-black/80">Momsats</span>
            <span>{invoiceData.taxRate}%</span>
          </div>

          <div className="flex justify-between py-2 text-sm">
            <span className="text-black/80">Moms</span>
            <span>{formatCurrency(calculateTax(), invoiceData.currency)}</span>
          </div>

          <div className="flex justify-between py-3 font-bold text-base border-t-2 border-gray-300 mt-2 pt-3">
            <span>Total inkl. moms</span>
            <span>{formatCurrency(calculateTotal(), invoiceData.currency)}</span>
          </div>
        </div>
      </div>

      {invoiceData.notes && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/70 mb-2">Anteckningar</h2>
          <p className="text-black/80 whitespace-pre-line text-sm">{invoiceData.notes}</p>
        </div>
      )}

      <div className="text-center text-black/50 text-xs mt-12 border-t border-gray-200 pt-4">
        <p className="whitespace-pre-line">{invoiceData.footer}</p>
      </div>
    </div>
  );
}
