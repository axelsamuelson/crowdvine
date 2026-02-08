"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="orders">Ordrar</TabsTrigger>
        <TabsTrigger value="invoice">Skapa faktura</TabsTrigger>
      </TabsList>

      <TabsContent value="orders" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Ordrar</CardTitle>
                <CardDescription>
                  Online-ordrar från dirtywine.se och offline-ordrar i samma tabell
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as "all" | OrderType)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Sök..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-input rounded-md text-sm w-[180px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Offline-ordre
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="mt-2 text-muted-foreground">Laddar ordrar...</p>
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                        Typ
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                        Order ID
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                        Datum
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                        Kund
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                        E-post
                      </th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">
                        Totalt
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-border/50 hover:bg-muted/50"
                      >
                        <td className="p-2">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              order.type === "online"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {order.type === "online" ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-xs">{order.orderId}</td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {new Date(order.date).toLocaleDateString("sv-SE")}
                        </td>
                        <td className="p-2 font-medium">{order.customer}</td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {order.email}
                        </td>
                        <td className="p-2 text-right font-medium">
                          {formatPrice(order.totalCents)}
                        </td>
                        <td className="p-2">
                          <span className="text-xs text-muted-foreground">
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Inga ordrar</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
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
                  >
                    Rensa filter
                  </Button>
                ) : (
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Skapa offline-ordrar
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="invoice" className="mt-6">
        <InvoiceGenerator />
      </TabsContent>
    </Tabs>
  );
}
