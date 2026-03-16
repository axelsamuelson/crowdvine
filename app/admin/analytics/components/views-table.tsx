"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type Dimension = "wine" | "producer";
type SortKey = "plpViews" | "pdpViews" | "name";

type Row = {
  key: string;
  name: string;
  plpViews: number;
  pdpViews: number;
};

export function ViewsTable() {
  const [dimension, setDimension] = useState<Dimension>("wine");
  const [timeRange, setTimeRange] = useState<string>("30d");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("pdpViews");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const url = new URL("/api/admin/analytics/views", window.location.origin);
        url.searchParams.set("dimension", dimension);
        url.searchParams.set("timeRange", timeRange);
        const res = await fetch(url.toString());
        const data = await res.json();
        setRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (e) {
        console.error("Failed to fetch views analytics:", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [dimension, timeRange]);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let next = rows;
    if (q) {
      next = next.filter((r) => (r.name || "").toLowerCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...next].sort((a, b) => {
      if (sortKey === "name") {
        return a.name.localeCompare(b.name) * dir;
      }
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
    });
  }, [rows, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            PLP vs PDP Views
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Dimension: {dimension === "wine" ? "Wine" : "Producer"}
          </p>
        </div>
        <Badge variant="outline">{filteredAndSorted.length} rows</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-gray-200 dark:border-[#1F1F23]">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Dimension
          </label>
          <Select value={dimension} onValueChange={(v) => setDimension(v as Dimension)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wine">Wine</SelectItem>
              <SelectItem value="producer">Producer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Time range
          </label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">No data yet.</div>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-[#1F1F23] hover:bg-transparent dark:hover:bg-transparent">
                <TableHead className="text-gray-900 dark:text-white font-medium">
                  <Button
                    variant="ghost"
                    className="px-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                    onClick={() => toggleSort("name")}
                  >
                    Name <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right text-gray-900 dark:text-white font-medium">
                  <Button
                    variant="ghost"
                    className="px-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                    onClick={() => toggleSort("plpViews")}
                  >
                    PLP Views <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right text-gray-900 dark:text-white font-medium">
                  <Button
                    variant="ghost"
                    className="px-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                    onClick={() => toggleSort("pdpViews")}
                  >
                    PDP Views <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map((r) => (
                <TableRow key={r.key} className="border-gray-200 dark:border-[#1F1F23]">
                  <TableCell className="font-medium text-gray-900 dark:text-white">{r.name}</TableCell>
                  <TableCell className="text-right text-gray-900 dark:text-white">
                    <Badge variant="outline" className="text-gray-900 dark:text-white border-gray-300 dark:border-zinc-600">{r.plpViews}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-gray-900 dark:text-white">
                    <Badge variant="outline" className="text-gray-900 dark:text-white border-gray-300 dark:border-zinc-600">{r.pdpViews}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

