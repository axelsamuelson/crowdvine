"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Plus, Search } from "lucide-react";
import InvoiceGenerator from "@/components/admin/invoice-generator";

export type OrderType = "online" | "offline";

export interface DirtyWineOrder {
  id: string;
  type: OrderType;
  orderId: string;
  date: string;
  customer: string;
  email: string;
  totalCents: number;
  status: string;
  createdAt: string;
}

export function DirtyWineContent() {
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState<DirtyWineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | OrderType>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
  }, []);

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
      <TabsList className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-1 grid w-full grid-cols-2 max-w-md">
        <TabsTrigger
          value="orders"
          className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
        >
          Ordrar
        </TabsTrigger>
        <TabsTrigger
          value="invoice"
          className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
        >
          Skapa faktura
        </TabsTrigger>
      </TabsList>

      <TabsContent value="orders" className="mt-6">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Ordrar
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Online-ordrar från dirtywine.se och offline-ordrar i samma tabell
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as "all" | OrderType)}
              >
                <SelectTrigger className="w-[140px] rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 text-xs h-9">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-zinc-400" />
                <input
                  type="text"
                  placeholder="Sök..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm w-[180px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100 focus:ring-offset-0"
                />
              </div>
              <Button
                size="sm"
                className="rounded-lg text-xs font-medium h-9 bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Offline-ordre
              </Button>
            </div>
          </div>
          <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-zinc-600 border-t-gray-900 dark:border-t-zinc-100 mx-auto" />
                <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                  Laddar ordrar...
                </p>
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800">
                      <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                        Typ
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                        Order ID
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                        Datum
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                        Kund
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                        E-post
                      </th>
                      <th className="text-right p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                        Totalt
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="p-3">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              order.type === "online"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {order.type === "online" ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-gray-900 dark:text-zinc-100">
                          {order.orderId}
                        </td>
                        <td className="p-3 text-xs text-gray-600 dark:text-zinc-400">
                          {new Date(order.date).toLocaleDateString("sv-SE")}
                        </td>
                        <td className="p-3 text-xs font-medium text-gray-900 dark:text-zinc-100">
                          {order.customer}
                        </td>
                        <td className="p-3 text-xs text-gray-600 dark:text-zinc-400">
                          {order.email}
                        </td>
                        <td className="p-3 text-right text-xs font-medium text-gray-900 dark:text-zinc-100">
                          {formatPrice(order.totalCents)}
                        </td>
                        <td className="p-3 text-xs text-gray-600 dark:text-zinc-400">
                          {order.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <Package className="h-14 w-14 mx-auto mb-4 text-gray-400 dark:text-zinc-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">
                  Inga ordrar
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto mb-4">
                  {typeFilter !== "all" || searchTerm
                    ? "Inga ordrar matchar filter/sökning."
                    : "Online-ordrar från dirtywine.se eller offline-ordrar visas här."}
                </p>
                {typeFilter !== "all" || searchTerm ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTypeFilter("all");
                      setSearchTerm("");
                    }}
                    className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
                  >
                    Rensa filter
                  </Button>
                ) : (
                  <Button className="rounded-lg text-xs font-medium h-9 bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90">
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
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
          <InvoiceGenerator />
        </div>
      </TabsContent>
    </Tabs>
  );
}
