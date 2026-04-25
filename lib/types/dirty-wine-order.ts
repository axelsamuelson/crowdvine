import type { InvoiceData } from "@/types/invoice";

export type DirtyWineOrderType = "online" | "offline";

export interface DirtyWineOrderRow {
  id: string;
  type: DirtyWineOrderType;
  orderId: string;
  date: string;
  customer: string;
  email: string;
  totalCents: number;
  status: string;
  createdAt: string;
  /** Full invoice payload when loaded from API (list or detail). */
  invoiceData?: InvoiceData;
}
