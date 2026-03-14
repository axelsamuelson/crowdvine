"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Upload, Play, Globe, Check, X } from "lucide-react";
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

  const crawlStatusBadge = (
    status: CrawlStatus,
    source?: StarwinelistSourceRow
  ) => {
    const v: Record<CrawlStatus, { label: string; className: string }> = {
      pending: { label: "Väntar", className: "bg-gray-500 text-white" },
      crawling: { label: "Kör", className: "bg-amber-500 text-white" },
      completed: { label: "Klar", className: "bg-green-600 text-white" },
      failed: { label: "Misslyckad", className: "bg-red-600 text-white" },
      skipped: { label: "Hoppad över", className: "bg-blue-600 text-white" },
      partial: { label: "PDF ej nedladdad", className: "bg-violet-600 text-white" },
    };
    const { label, className } = v[status] ?? v.pending;
    const badge = <Badge className={className}>{label}</Badge>;
    if (!source) return badge;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="cursor-pointer text-left ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md">
            {badge}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-2">
            <p className="font-medium text-sm">Crawl-status: {label}</p>
            {source.last_crawled_at && (
              <p className="text-xs text-muted-foreground">
                Senast crawlad: {new Date(source.last_crawled_at).toLocaleString("sv-SE")}
              </p>
            )}
            {source.crawl_attempts != null && source.crawl_attempts > 0 && (
              <p className="text-xs text-muted-foreground">
                Antal försök: {source.crawl_attempts}
              </p>
            )}
            {source.last_error && (
              <div className="rounded bg-muted p-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Felmeddelande</p>
                <p className="text-xs text-red-700 break-words">{source.last_error}</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Menyextraktion
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Ladda upp menyer och kör AI-extraktion för att få strukturerade vinrader.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Ladda upp meny
        </Button>
      </div>

      {/* Starwinelist-källor: en tabell med PDF-status, filnamn, crawl och extraktion */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Starwinelist-källor
              </CardTitle>
              <CardDescription>
                Restauranger från Starwinelist Stockholm. Kör crawl för att hämta PDF-menyer och skapa dokument.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {browserAdapter === "playwright" && (
                <Badge className="bg-green-600 text-white">Playwright (lokal)</Badge>
              )}
              {browserAdapter === "browserless" && (
                <Badge className="bg-blue-600 text-white">Browserless</Badge>
              )}
              <Button onClick={handleCrawlNow} disabled={crawlRunning}>
                {crawlRunning ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Kör crawl…
                  </span>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Kör crawl nu
                  </>
                )}
              </Button>
            </div>
          </div>
          {crawlSkippedReason === "missing_browserless_key" && (
            <div className="mt-2 p-3 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-sm">
              Crawl kräver BROWSERLESS_API_KEY. Sätt nyckeln i miljövariabler för att aktivera automatisk crawling.
            </div>
          )}
          {crawlSummary?.rate_limit_429 && (
            <div className="mt-2 p-3 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-sm">
              Browserless rate limit nådd – vänta några minuter och försök igen. Free tier tillåter ~20–30 anrop/minut.
            </div>
          )}
          {crawlSummary && (
            <div className="flex flex-wrap gap-4 text-sm mt-2 p-3 bg-muted/50 rounded-md">
              <span>Totalt: {crawlSummary.total_found}</span>
              <span className="text-green-700">Nya PDF:er: {crawlSummary.new_pdfs}</span>
              <span className="text-blue-700">Uppdaterade: {crawlSummary.updated_pdfs}</span>
              <span className="text-gray-600">Hoppade över: {crawlSummary.skipped}</span>
              {typeof crawlSummary.partial === "number" && crawlSummary.partial > 0 && (
                <span className="text-violet-700">PDF ej nedladdad: {crawlSummary.partial}</span>
              )}
              <span className="text-red-700">Misslyckade: {crawlSummary.failed}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {sourcesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-900 border-t-transparent" />
            </div>
          ) : sources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Inga Starwinelist-källor ännu. Klicka &quot;Kör crawl nu&quot; för att hämta restauranger från Stockholm.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-gray-600">Restaurang</TableHead>
                    <TableHead className="text-gray-600">Slug</TableHead>
                    <TableHead className="text-gray-600">Senast uppdaterad (SWL)</TableHead>
                    <TableHead className="text-gray-600">PDF nedladdad</TableHead>
                    <TableHead className="text-gray-600">Filnamn</TableHead>
                    <TableHead className="text-gray-600">Crawl-status</TableHead>
                    <TableHead className="text-gray-600">Extraktion</TableHead>
                    <TableHead className="text-gray-600">Senast crawlad</TableHead>
                    <TableHead className="text-gray-600">Åtgärd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((s) => (
                    <TableRow key={s.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{s.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{s.slug}</TableCell>
                      <TableCell className="text-sm">{s.swl_updated_at ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {s.latest_document_id ? (
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <Check className="h-4 w-4" /> Ja
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <X className="h-4 w-4" /> Nej
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono max-w-[180px] truncate" title={s.latest_document?.file_name ?? undefined}>
                        {s.latest_document?.file_name ?? "—"}
                      </TableCell>
                      <TableCell>{crawlStatusBadge(s.crawl_status, s)}</TableCell>
                      <TableCell>
                        {s.latest_document ? (
                          statusBadge(s.latest_document.extraction_status as ExtractionStatus)
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.last_crawled_at
                          ? new Date(s.last_crawled_at).toLocaleString("sv-SE")
                          : "—"}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        {s.pdf_url && (
                          <a href={s.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                            Länk
                          </a>
                        )}
                        {s.latest_document_id && (
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/menu-extraction/${s.latest_document_id}`)}
                            className="text-primary underline text-sm"
                          >
                            Öppna
                          </button>
                        )}
                        {(s.crawl_status === "partial" || s.crawl_status === "failed") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryCrawl(s.slug);
                            }}
                          >
                            Försök igen
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ladda upp meny</DialogTitle>
            <DialogDescription>
              Ange sökväg till filen och filnamn. Raw text kan sättas i detaljvyn eller via API.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file_path">Sökväg (file_path)</Label>
              <Input
                id="file_path"
                placeholder="t.ex. menus/restaurang-x.pdf"
                value={uploadForm.file_path}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, file_path: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="file_name">Filnamn</Label>
              <Input
                id="file_name"
                placeholder="t.ex. vinlista-2024.pdf"
                value={uploadForm.file_name}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, file_name: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleUploadSubmit} disabled={submitting}>
              {submitting ? "Skapar…" : "Skapa dokument"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
