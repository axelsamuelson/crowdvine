export function invoiceStatusSv(status: string): string {
  switch (status) {
    case "draft":
      return "utkast";
    case "issued":
      return "utfärdad";
    case "paid":
      return "betald";
    case "void":
      return "makulerad";
    default:
      return status;
  }
}

export function invoiceLockedMessage(
  invoiceNumber: string | null,
  status: string,
): string {
  const label = invoiceNumber?.trim() ? invoiceNumber : "utan nummer";
  return `Faktura ${label} är ${invoiceStatusSv(status)} och kan inte ändras`;
}
