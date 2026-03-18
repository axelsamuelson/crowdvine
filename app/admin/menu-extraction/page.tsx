"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Play, Globe, Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ExtractionStatus = "pending" | "processing" | "completed" | "failed";
type CrawlStatus = "pending" | "crawling" | "completed" | "failed" | "skipped" | "partial";

interface StarwinelistSourceRow {
  id: string;
  slug: string;
  name: string | null;
  city: string;
  source_url: string;
  swl_updated_at: string | null;
  pdf_url: string | null;
  crawl_status: CrawlStatus;
  last_crawled_at: string | null;
  last_error: string | null;
  crawl_attempts?: number;
  latest_document_id: string | null;
  latest_document?: { id: string; file_name: string; extraction_status: string } | null;
}

interface CrawlSummary {
  total_found: number;
  new_pdfs: number;
  updated_pdfs: number;
  skipped: number;
  failed: number;
  partial?: number;
  rate_limit_429?: boolean;
  document_ids: string[];
}

export default function MenuExtractionOverviewPage() {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file_path: "", file_name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [openByPath, setOpenByPath] = useState("");
  const [openByPathLoading, setOpenByPathLoading] = useState(false);

  const [sources, setSources] = useState<StarwinelistSourceRow[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [crawlRunning, setCrawlRunning] = useState(false);
  const [crawlSummary, setCrawlSummary] = useState<CrawlSummary | null>(null);
  const [crawlSkippedReason, setCrawlSkippedReason] = useState<string | null>(null);
  const [browserAdapter, setBrowserAdapter] = useState<"playwright" | "browserless" | null>(null);

  const loadSources = async () => {
    setSourcesLoading(true);
    try {
      const res = await fetch("/api/admin/menu-extraction/crawl/sources");
      if (!res.ok) throw new Error("Kunde inte ladda källor");
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch {
      setSources([]);
    } finally {
      setSourcesLoading(false);
    }
  };

  const loadCrawlConfig = async () => {
    try {
      const res = await fetch("/api/admin/menu-extraction/crawl/config");
      if (!res.ok) return;
      const data = await res.json();
      setBrowserAdapter(data.browserAdapter ?? null);
    } catch {
      setBrowserAdapter(null);
    }
  };

  useEffect(() => {
    loadSources();
    loadCrawlConfig();
  }, []);

  const handleUploadSubmit = async () => {
    if (!uploadForm.file_path.trim() || !uploadForm.file_name.trim()) {
      toast.error("Fyll i sökväg och filnamn");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/menu-extraction/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: uploadForm.file_path.trim(),
          file_name: uploadForm.file_name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte skapa dokument");
      toast.success("Dokument skapat");
      setUploadOpen(false);
      setUploadForm({ file_path: "", file_name: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte skapa");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCrawlNow = async () => {
    setCrawlRunning(true);
    setCrawlSummary(null);
    setCrawlSkippedReason(null);
    try {
      const res = await fetch("/api/admin/menu-extraction/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: "stockholm" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Crawl misslyckades");
      if (data.skipped === true && data.reason === "missing_browserless_key") {
        setCrawlSkippedReason("missing_browserless_key");
      } else {
        setCrawlSummary(data.summary ?? null);
        toast.success("Crawl klar");
      }
      loadSources();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Crawl misslyckades");
    } finally {
      setCrawlRunning(false);
    }
  };

  const crawlStatusBadge = (status: CrawlStatus, source?: StarwinelistSourceRow) => {
    const v: Record<CrawlStatus, { label: string; className: string }> = {
      pending: { label: "Väntar", className: "bg-gray-500 text-white dark:bg-zinc-600" },
      crawling: { label: "Kör", className: "bg-amber-500 text-white" },
      completed: { label: "Klar", className: "bg-green-600 text-white dark:bg-green-700" },
      failed: { label: "Misslyckad", className: "bg-red-600 text-white dark:bg-red-700" },
      skipped: { label: "Hoppad över", className: "bg-blue-600 text-white dark:bg-blue-700" },
      partial: { label: "PDF ej nedladdad", className: "bg-violet-600 text-white dark:bg-violet-700" },
    };
    const { label, className } = v[status] ?? v.pending;
    const badge = <Badge className={className}>{label}</Badge>;
    if (!source) return badge;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="cursor-pointer text-left rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-zinc-500">
            {badge}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-white dark:bg-[#1F1F23] border-gray-200 dark:border-zinc-700" align="start">
          <div className="space-y-2 text-gray-900 dark:text-zinc-100">
            <p className="font-medium text-sm">Crawl-status: {label}</p>
            {source.last_crawled_at && (
              <p className="text-xs text-gray-500 dark:text-zinc-200">
                Senast crawlad: {new Date(source.last_crawled_at).toLocaleString("sv-SE")}
              </p>
            )}
            {source.crawl_attempts != null && source.crawl_attempts > 0 && (
              <p className="text-xs text-gray-500 dark:text-zinc-200">Antal försök: {source.crawl_attempts}</p>
            )}
            {source.last_error && (
              <div className="rounded bg-gray-100 dark:bg-zinc-800 p-2">
                <p className="text-xs font-medium text-gray-600 dark:text-zinc-200 mb-1">Felmeddelande</p>
                <p className="text-xs text-red-700 dark:text-red-400 break-words">{source.last_error}</p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const handleRetryCrawl = async (slug: string) => {
    try {
      const res = await fetch("/api/admin/menu-extraction/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Retry misslyckades");
      toast.success(`Crawl för ${slug} klar`);
      loadSources();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry misslyckades");
    }
  };

  const statusBadge = (status: ExtractionStatus) => {
    const v = {
      pending: { label: "Väntar", variant: "secondary" as const },
      processing: { label: "Kör", variant: "secondary" as const },
      completed: { label: "Klar", variant: "default" as const },
      failed: { label: "Misslyckad", variant: "destructive" as const },
    };
    const { label, variant } = v[status] ?? v.pending;
    const className =
      status === "completed"
        ? "bg-green-600 hover:bg-green-700 text-white"
        : status === "failed"
          ? "bg-red-600 hover:bg-red-700 text-white"
          : status === "processing"
            ? "bg-amber-500 hover:bg-amber-600 text-white"
            : "";
    return (
      <Badge variant={variant} className={className}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
          <Sparkles className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Menyextraktion
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            Ladda upp menyer, crawla Starwinelist och kör AI-extraktion av vinrader
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vänster: sammanfattning – samma stil som Platform overview */}
        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Upload className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Ladda upp meny
          </h2>
          <div className="flex-1">
            <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl">
              <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
                <p className="text-xs text-gray-600 dark:text-zinc-200">Starwinelist-källor</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50">
                  {sourcesLoading ? "…" : sources.length}
                </p>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-600 dark:text-zinc-200 mb-3">
                  Ladda upp menyer och kör AI-extraktion för strukturerade vinrader.
                </p>
                <Button
                  onClick={() => setUploadOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Ladda upp meny
                </Button>
              </div>
              <div className="p-3 border-t border-gray-100 dark:border-zinc-800">
                <p className="text-xs text-gray-600 dark:text-zinc-200 mb-2">Öppna dokument (sökväg)</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="t.ex. babette/2026-03-10T23-24-53-885Z.pdf"
                    value={openByPath}
                    onChange={(e) => setOpenByPath(e.target.value)}
                    className="flex-1 min-w-0 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!openByPath.trim() || openByPathLoading}
                    className="shrink-0 text-xs"
                    onClick={async () => {
                      if (!openByPath.trim()) return;
                      setOpenByPathLoading(true);
                      try {
                        const res = await fetch(
                          `/api/admin/menu-extraction/documents/by-path?file_path=${encodeURIComponent(openByPath.trim())}`
                        );
                        const data = await res.json();
                        if (!res.ok) {
                          toast.error(data.error || "Dokument hittades inte");
                          return;
                        }
                        router.push(`/admin/menu-extraction/${data.document.id}`);
                      } catch {
                        toast.error("Kunde inte öppna dokument");
                      } finally {
                        setOpenByPathLoading(false);
                      }
                    }}
                  >
                    {openByPathLoading ? "…" : "Öppna"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Höger: crawl – samma stil som Recent Bookings */}
        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Crawl (Stockholm)
          </h2>
          <div className="flex-1">
            <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl">
              <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex flex-wrap gap-2">
                  {browserAdapter === "playwright" && (
                    <Badge className="bg-green-600 dark:bg-green-700 text-white">Playwright (lokal)</Badge>
                  )}
                  {browserAdapter === "browserless" && (
                    <Badge className="bg-blue-600 dark:bg-blue-700 text-white">Browserless</Badge>
                  )}
                </div>
                <Button
                  onClick={handleCrawlNow}
                  disabled={crawlRunning}
                  className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
                >
                  {crawlRunning ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-zinc-900 border-t-transparent" />
                      Kör crawl…
                    </span>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 mr-2" />
                      Kör crawl nu
                    </>
                  )}
                </Button>
              </div>
              {crawlSkippedReason === "missing_browserless_key" && (
                <div className="p-3 text-xs bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  Crawl kräver BROWSERLESS_API_KEY. Sätt nyckeln i miljövariabler.
                </div>
              )}
              {crawlSummary?.rate_limit_429 && (
                <div className="p-3 text-xs bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  Browserless rate limit – vänta några minuter och försök igen.
                </div>
              )}
              {crawlSummary && (
                <div className="p-3 text-xs flex flex-wrap gap-x-4 gap-y-1 text-gray-700 dark:text-zinc-200 border-b border-gray-100 dark:border-zinc-800">
                  <span>Totalt: {crawlSummary.total_found}</span>
                  <span className="text-green-700 dark:text-green-400">Nya PDF:er: {crawlSummary.new_pdfs}</span>
                  <span className="text-blue-700 dark:text-blue-400">Uppdaterade: {crawlSummary.updated_pdfs}</span>
                  <span className="text-gray-600 dark:text-zinc-200">Hoppade över: {crawlSummary.skipped}</span>
                  {typeof crawlSummary.partial === "number" && crawlSummary.partial > 0 && (
                    <span className="text-violet-700 dark:text-violet-400">PDF ej nedladdad: {crawlSummary.partial}</span>
                  )}
                  <span className="text-red-700 dark:text-red-400">Misslyckade: {crawlSummary.failed}</span>
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-gray-600 dark:text-zinc-200">
                  Hämtar PDF-menyer från Starwinelist Stockholm och skapar dokument.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullbredd: källor-lista – samma kort som Pallets & Quick actions / Business */}
      <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6 flex flex-col">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
          Starwinelist-källor
        </h2>
        <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl">
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Restauranger
              <span className="text-xs font-normal text-gray-500 dark:text-zinc-200 ml-1">
                ({sources.length} st)
              </span>
            </h3>
          </div>
          <div className="p-2">
            {sourcesLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-zinc-600 border-t-gray-900 dark:border-t-white" />
              </div>
            ) : sources.length === 0 ? (
              <p className="text-sm text-center py-8 text-gray-500 dark:text-zinc-200">
                Inga källor ännu. Klicka &quot;Kör crawl nu&quot; för att hämta restauranger från Stockholm.
              </p>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950/50">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-zinc-900/70 border-b border-gray-200 dark:border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400 py-3 pl-4 w-[28%]">
                        Källa
                      </TableHead>
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400 py-3 w-[18%]" title="Har PDF hämtats från Starwinelist?">
                        PDF-hämtning
                      </TableHead>
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400 py-3 w-[18%]" title="Har AI extraherat vinrader från PDF:en?">
                        AI-extraktion
                      </TableHead>
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400 py-3 w-[20%]">
                        Uppdaterad
                      </TableHead>
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400 py-3 pr-4 text-right w-[16%]">
                        Åtgärder
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map((s) => (
                      <TableRow
                        key={s.id}
                        role={s.latest_document_id ? "button" : undefined}
                        tabIndex={s.latest_document_id ? 0 : undefined}
                        onClick={s.latest_document_id ? () => router.push(`/admin/menu-extraction/${s.latest_document_id}`) : undefined}
                        onKeyDown={s.latest_document_id ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/admin/menu-extraction/${s.latest_document_id}`); } } : undefined}
                        className={cn(
                          "border-gray-100 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800/50",
                          s.latest_document_id && "cursor-pointer"
                        )}
                      >
                        <TableCell className="py-2.5 pl-4 align-top">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-zinc-100 truncate" title={s.name ?? undefined}>
                              {s.name ?? "—"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-200 font-mono truncate" title={s.slug}>
                              {s.slug}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 align-top" title="Crawl: har PDF hämtats från Starwinelist?">
                          {crawlStatusBadge(s.crawl_status, s)}
                        </TableCell>
                        <TableCell className="py-2.5 align-top" title="Har AI extraherat vinrader från PDF:en?">
                          {s.latest_document ? (
                            statusBadge(s.latest_document.extraction_status as ExtractionStatus)
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 align-top">
                          <div className="text-xs text-gray-600 dark:text-zinc-200 space-y-0.5">
                            {s.swl_updated_at && (
                              <p>
                                <span className="text-gray-400 dark:text-zinc-500">SWL:</span> {s.swl_updated_at}
                              </p>
                            )}
                            {s.last_crawled_at ? (
                              <p>
                                <span className="text-gray-400 dark:text-zinc-500">Crawl:</span>{" "}
                                {new Date(s.last_crawled_at).toLocaleString("sv-SE")}
                              </p>
                            ) : (
                              <p className="text-gray-500 dark:text-zinc-400">Crawl: —</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 pr-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {s.pdf_url && (
                              <a
                                href={s.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                PDF-länk
                              </a>
                            )}
                            {(s.crawl_status === "partial" || s.crawl_status === "failed") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-zinc-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetryCrawl(s.slug);
                                }}
                              >
                                Försök igen
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1F1F23] border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Ladda upp meny</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-zinc-200">
              Ange sökväg till filen och filnamn. Raw text kan sättas i detaljvyn eller via API.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file_path" className="text-gray-700 dark:text-zinc-200">Sökväg (file_path)</Label>
              <Input
                id="file_path"
                placeholder="t.ex. menus/restaurang-x.pdf"
                value={uploadForm.file_path}
                onChange={(e) => setUploadForm((f) => ({ ...f, file_path: e.target.value }))}
                className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="file_name" className="text-gray-700 dark:text-zinc-200">Filnamn</Label>
              <Input
                id="file_name"
                placeholder="t.ex. vinlista-2024.pdf"
                value={uploadForm.file_name}
                onChange={(e) => setUploadForm((f) => ({ ...f, file_name: e.target.value }))}
                className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} className="border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white">
              Avbryt
            </Button>
            <Button onClick={handleUploadSubmit} disabled={submitting} className="bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900">
              {submitting ? "Skapar…" : "Skapa dokument"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
