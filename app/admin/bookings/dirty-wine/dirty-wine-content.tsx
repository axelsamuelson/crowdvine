"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Package, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import InvoiceGenerator from "@/components/admin/invoice-generator";
import type { DirtyWineOrderRow } from "@/lib/types/dirty-wine-order";

export type { DirtyWineOrderType as OrderType } from "@/lib/types/dirty-wine-order";
export type DirtyWineOrder = DirtyWineOrderRow;

export function DirtyWineContent() {
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState<DirtyWineOrderRow[]>([]);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | DirtyWineOrderRow["type"]>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOrder, setEditingOrder] = useState<DirtyWineOrderRow | null>(null);

  const handleOfflineRowClick = useCallback(async (order: DirtyWineOrderRow) => {
    if (order.type !== "offline") return;
    let inv = order.invoiceData;
    if (!inv) {
      const res = await fetch(`/api/admin/bookings/dirty-wine-orders/${order.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Kunde inte läsa order.");
        return;
      }
      inv = data.order?.invoiceData;
      if (!inv) {
        toast.error("Fakturadata saknas för denna order.");
        return;
      }
    }
    setEditingOrder({ ...order, invoiceData: inv });
    setActiveTab("invoice");
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        // TODO: Fetch from API when B2B orders integration exists
        const res = await fetch("/api/admin/bookings/dirty-wine-orders");
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        } else {
          setOrders([]);
        }
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [ordersRefresh]);

  const filteredOrders = orders.filter((order) => {
    const matchesType =
      typeFilter === "all" || order.type === typeFilter;
    const matchesSearch =
      !searchTerm ||
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(cents / 100);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl border border-border bg-muted p-1 text-muted-foreground dark:border-zinc-700 dark:bg-zinc-900">
        <TabsTrigger
          value="orders"
          className="rounded-lg text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:text-zinc-400 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-zinc-100"
        >
          Ordrar
        </TabsTrigger>
        <TabsTrigger
          value="invoice"
          className="rounded-lg text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:text-zinc-400 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-zinc-100"
        >
          Skapa faktura
        </TabsTrigger>
      </TabsList>

      <TabsContent value="orders" className="mt-6">
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground dark:text-zinc-100">
            <Package className="h-3.5 w-3.5 shrink-0 text-foreground dark:text-zinc-100" aria-hidden />
            Ordrar
          </h2>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground dark:text-zinc-400">
              Online-ordrar från dirtywine.se och offline-ordrar i samma tabell
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as "all" | DirtyWineOrderRow["type"])}
              >
                <SelectTrigger className="h-9 w-[140px] rounded-lg border-gray-200 bg-white text-xs text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-zinc-400" />
                <input
                  type="text"
                  placeholder="Sök..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[180px] rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:ring-zinc-400"
                />
              </div>
              <Button
                size="sm"
                className="h-9 rounded-lg bg-gray-900 text-xs font-medium text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Offline-ordre
              </Button>
            </div>
          </div>
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-[#1C1C1F]">
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900 dark:border-zinc-700 dark:border-t-zinc-100" />
                <p className="mt-2 text-xs text-muted-foreground dark:text-zinc-400">
                  Laddar ordrar...
                </p>
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800">
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground dark:text-zinc-400">
                        Typ
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground dark:text-zinc-400">
                        Order ID
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground dark:text-zinc-400">
                        Datum
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground dark:text-zinc-400">
                        Kund
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground dark:text-zinc-400">
                        E-post
                      </th>
                      <th className="p-3 text-right text-xs font-medium text-muted-foreground dark:text-zinc-400">
                        Totalt
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground dark:text-zinc-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const rowCells = (
                        <>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                order.type === "online"
                                  ? "bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/40"
                                  : "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40"
                              }`}
                            >
                              {order.type === "online" ? "Online" : "Offline"}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-foreground dark:text-zinc-100">{order.orderId}</td>
                          <td className="p-3 text-xs text-muted-foreground dark:text-zinc-400">
                            {new Date(order.date).toLocaleDateString("sv-SE")}
                          </td>
                          <td className="p-3 text-xs font-medium text-foreground dark:text-zinc-100">{order.customer}</td>
                          <td className="p-3 text-xs text-muted-foreground dark:text-zinc-400">{order.email}</td>
                          <td className="p-3 text-right text-xs font-medium tabular-nums text-foreground dark:text-zinc-100">
                            {formatPrice(order.totalCents)}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground dark:text-zinc-400">{order.status}</td>
                        </>
                      );

                      if (order.type === "online") {
                        return (
                          <Tooltip key={order.id}>
                            <TooltipTrigger asChild>
                              <tr className="border-b border-gray-200 bg-white transition-colors last:border-0 cursor-default dark:border-zinc-700 dark:bg-zinc-900">
                                {rowCells}
                              </tr>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs border border-gray-200 bg-white text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                              Online-ordrar kan inte redigeras
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return (
                        <tr
                          key={order.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => void handleOfflineRowClick(order)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              void handleOfflineRowClick(order);
                            }
                          }}
                          className="border-b border-gray-200 bg-white transition-colors last:border-0 hover:bg-gray-100 cursor-pointer dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        >
                          {rowCells}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-12 text-center">
                <Package className="mx-auto mb-4 h-14 w-14 text-muted-foreground dark:text-zinc-500" />
                <h3 className="mb-1 text-sm font-semibold text-foreground dark:text-zinc-100">Inga ordrar</h3>
                <p className="mx-auto mb-4 max-w-md text-xs text-muted-foreground dark:text-zinc-400">
                  {typeFilter !== "all" || searchTerm
                    ? "Inga ordrar matchar filter/sökning."
                    : "Online-ordrar från dirtywine.se (kommande) och offline-ordrar du sparar under Skapa faktura → Spara som order (offline) visas här."}
                </p>
                {typeFilter !== "all" || searchTerm ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTypeFilter("all");
                      setSearchTerm("");
                    }}
                    className="rounded-lg border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                  >
                    Rensa filter
                  </Button>
                ) : (
                  <Button className="h-9 rounded-lg bg-gray-900 text-xs font-medium text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Skapa offline-ordrar
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="invoice" className="mt-6">
        {editingOrder ? (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-sm text-gray-900 dark:text-zinc-100">
              Redigerar order {editingOrder.orderId} · {editingOrder.customer}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-lg border-gray-200 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setEditingOrder(null)}
            >
              Avbryt
            </Button>
          </div>
        ) : null}
        <InvoiceGenerator
          key={editingOrder ? `order-${editingOrder.id}` : "new-invoice"}
          initialInvoice={editingOrder?.invoiceData}
          offlineOrderId={editingOrder?.id}
          onOrderUpdated={() => {
            setEditingOrder(null);
            setOrdersRefresh((n) => n + 1);
            setActiveTab("orders");
          }}
          onOfflineOrderCreated={() => {
            setOrdersRefresh((n) => n + 1);
            setActiveTab("orders");
          }}
        />
      </TabsContent>
    </Tabs>
  );
}
