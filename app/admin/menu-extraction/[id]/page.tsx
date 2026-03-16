"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, Play, AlertTriangle, ChevronDown, ChevronRight, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";

type ExtractionStatus = "pending" | "processing" | "completed" | "failed";
type ConfidenceLabel = "high" | "medium" | "low";

interface MenuDocument {
  id: string;
  file_name: string;
  file_path: string;
  extraction_status: ExtractionStatus;
  created_at?: string;
  extracted_at?: string | null;
  model_version?: string | null;
  prompt_version?: string | null;
  workflow_version?: string | null;
  error_message?: string | null;
  raw_text?: string | null;
}

interface MenuDocumentSection {
  id: string;
  section_name: string;
  normalized_section: string | null;
  section_order: number;
}

interface MenuExtractedRow {
  id: string;
  row_index: number;
  raw_text: string;
  producer: string | null;
  wine_name: string | null;
  vintage: string | null;
  country: string | null;
  region: string | null;
  price_glass: number | null;
  price_bottle: number | null;
  confidence_label: ConfidenceLabel | null;
  needs_review: boolean;
  review_reasons: string[] | null;
  section_id: string | null;
}

interface DocumentDetailResponse {
  document: MenuDocument;
  sections: MenuDocumentSection[];
  rows: MenuExtractedRow[];
  stats: {
    total_rows: number;
    needs_review_count: number;
    high_confidence_count: number;
    by_section: Record<string, number>;
  };
}

const RAW_TEXT_TRUNCATE = 60;

export default function MenuExtractionDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [data, setData] = useState<DocumentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractTextLoading, setExtractTextLoading] = useState(false);
  const [expandedRaw, setExpandedRaw] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/menu-extraction/documents/${id}`);
      if (res.status === 404) {
        setData(null);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Kunde inte ladda");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Något gick fel");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleExtract = async () => {
    if (!id) return;
    setExtracting(true);
    try {
      const res = await fetch(`/api/admin/menu-extraction/documents/${id}/extract`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Extraction misslyckades");
      }
      toast.success("Extraction klar");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction misslyckades");
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractText = async () => {
    if (!id) return;
    setExtractTextLoading(true);
    try {
      const res = await fetch(`/api/admin/menu-extraction/documents/${id}/extract-text`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Kunde inte extrahera text");
      }
      toast.success(`Text extraherad (${json.raw_text_length ?? 0} tecken)`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte extrahera text");
    } finally {
      setExtractTextLoading(false);
    }
  };

  const statusBadge = (status: ExtractionStatus) => {
    const v = {
      pending: { label: "Väntar", className: "bg-gray-500 text-white" },
      processing: { label: "Kör", className: "bg-amber-500 text-white" },
      completed: { label: "Klar", className: "bg-green-600 text-white" },
      failed: { label: "Misslyckad", className: "bg-red-600 text-white" },
    };
    const { label, className } = v[status] ?? v.pending;
    return (
      <Badge className={`${className} hover:opacity-90`}>
        {label}
      </Badge>
    );
  };

  const confidenceBadge = (label: ConfidenceLabel | null) => {
    if (!label) return <span className="text-gray-500 dark:text-zinc-400">—</span>;
    const v = {
      high: "bg-green-600 text-white dark:bg-green-700",
      medium: "bg-amber-500 text-white",
      low: "bg-red-600 text-white dark:bg-red-700",
    };
    return (
      <Badge className={v[label]} variant="secondary">
        {label}
      </Badge>
    );
  };

  const toggleRaw = (rowId: string) => {
    setExpandedRaw((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  if (!id) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500 dark:text-zinc-400">Ogiltigt dokument-id.</p>
        <Link href="/admin/menu-extraction">
          <Button variant="outline" className="border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white">Tillbaka till listan</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-zinc-600 border-t-gray-900 dark:border-t-white" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500 dark:text-zinc-400">Dokumentet hittades inte.</p>
        <Link href="/admin/menu-extraction">
          <Button variant="outline" className="border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white">Tillbaka till listan</Button>
        </Link>
      </div>
    );
  }

  const { document: doc, sections, rows, stats } = data;
  const rowsBySection = new Map<string, MenuExtractedRow[]>();
  for (const s of sections) {
    rowsBySection.set(s.id, rows.filter((r) => r.section_id === s.id));
  }
  const uncategorizedRows = rows.filter((r) => !r.section_id);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/menu-extraction">
            <Button variant="ghost" size="icon" aria-label="Tillbaka" className="text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800/50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{doc.file_name}</h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono truncate">{doc.file_path}</p>
          </div>
        </div>

        {/* Dokument – dashboard-kort */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Dokument
          </h2>
<div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl">
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-zinc-400">Extraktion</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {statusBadge(doc.extraction_status)}
                  {doc.error_message && (
                    <span className="text-xs text-red-600 dark:text-red-400">{doc.error_message}</span>
                  )}
                </div>
              </div>
              <Button
                onClick={handleExtract}
                disabled={extracting}
                className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
              >
                {extracting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-zinc-900 border-t-transparent" />
                    Kör extraction…
                  </span>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-2" />
                    Kör extraction
                  </>
                )}
              </Button>
            </div>
            {!doc.raw_text?.trim() && (
              <div className="p-4 border-b border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 text-sm space-y-2">
                <p className="font-medium text-amber-900 dark:text-amber-200">Raw text saknas</p>
                <p className="text-amber-800 dark:text-amber-300/90 text-xs">
                  AI-extraktion behöver text från PDF:en. Om PDF:en är skannad eller text inte extraherats, använd knappen nedan.
                </p>
                {doc.file_path?.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExtractText}
                    disabled={extractTextLoading}
                    className="border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white"
                  >
                    {extractTextLoading ? "Extraherar text…" : "Extrahera text från PDF"}
                  </Button>
                )}
              </div>
            )}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-500 dark:text-zinc-400">Uppladdad</span>
                <p className="font-medium text-gray-900 dark:text-zinc-100 mt-0.5">
                  {doc.created_at ? new Date(doc.created_at).toLocaleString("sv-SE") : "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-zinc-400">Extraherad</span>
                <p className="font-medium text-gray-900 dark:text-zinc-100 mt-0.5">
                  {doc.extracted_at ? new Date(doc.extracted_at).toLocaleString("sv-SE") : "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-500 dark:text-zinc-400">Modell / prompt / workflow</span>
                <p className="font-medium text-gray-900 dark:text-zinc-100 mt-0.5 truncate" title={`${doc.model_version ?? ""} / ${doc.prompt_version ?? ""} / ${doc.workflow_version ?? ""}`}>
                  {doc.model_version ?? "—"} / {doc.prompt_version ?? "—"} / {doc.workflow_version ?? "—"}
                </p>
              </div>
            </div>
            <div className="px-4 pb-4 flex flex-wrap gap-4 text-xs text-gray-700 dark:text-zinc-300">
              <span><strong className="text-gray-900 dark:text-zinc-100">Totalt rader:</strong> {stats.total_rows}</span>
              <span><strong className="text-gray-900 dark:text-zinc-100">Needs review:</strong> {stats.needs_review_count}</span>
              <span><strong className="text-gray-900 dark:text-zinc-100">High confidence:</strong> {stats.high_confidence_count}</span>
            </div>
          </div>
        </div>

        {/* Extraherade rader */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Extraherade rader
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">Grupperat per sektion. Rader som behöver granskning har gul bakgrund.</p>
          <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-4 space-y-6">
            {sections.length === 0 && uncategorizedRows.length === 0 ? (
              <p className="text-sm text-center text-gray-500 dark:text-zinc-400 py-8">
                Inga rader ännu. Kör extraction ovan.
              </p>
            ) : (
              <>
                {sections.map((sec) => {
                  const sectionRows = rowsBySection.get(sec.id) ?? [];
                  if (sectionRows.length === 0) return null;
                  return (
                    <div key={sec.id}>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-2">
                        {sec.section_name}
                        {sec.normalized_section && (
                          <span className="text-gray-500 dark:text-zinc-400 font-normal ml-2">({sec.normalized_section})</span>
                        )}
                      </h3>
                      <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 hover:bg-transparent">
                              <TableHead className="w-8 text-xs text-gray-500 dark:text-zinc-400">#</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Råtext</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Producent</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Vinnamn</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Årgång</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Land</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Region</TableHead>
                              <TableHead className="text-right text-xs text-gray-500 dark:text-zinc-400">Glas</TableHead>
                              <TableHead className="text-right text-xs text-gray-500 dark:text-zinc-400">Flaska</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Confidence</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Review</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sectionRows.map((row) => (
                              <TableRow
                                key={row.id}
                                className={
                                  row.needs_review
                                    ? "bg-amber-50/90 dark:bg-amber-900/25 hover:bg-amber-100/90 dark:hover:bg-amber-900/35 border-gray-100 dark:border-zinc-800"
                                    : "border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/30"
                                }
                              >
                                <TableCell className="text-gray-500 dark:text-zinc-400 text-sm">{row.row_index + 1}</TableCell>
                                <TableCell className="max-w-[200px]">
                                  <RawTextCell
                                    rawText={row.raw_text}
                                    rowId={row.id}
                                    expanded={expandedRaw.has(row.id)}
                                    onToggle={() => toggleRaw(row.id)}
                                  />
                                </TableCell>
                                <TableCell className="text-sm text-gray-900 dark:text-zinc-100">{row.producer ?? "—"}</TableCell>
                                <TableCell className="text-sm font-medium text-gray-900 dark:text-zinc-100">{row.wine_name ?? "—"}</TableCell>
                                <TableCell className="text-sm text-gray-700 dark:text-zinc-300">{row.vintage ?? "—"}</TableCell>
                                <TableCell className="text-sm text-gray-700 dark:text-zinc-300">{row.country ?? "—"}</TableCell>
                                <TableCell className="text-sm text-gray-700 dark:text-zinc-300">{row.region ?? "—"}</TableCell>
                                <TableCell className="text-right text-sm text-gray-900 dark:text-zinc-100">{row.price_glass != null ? row.price_glass : "—"}</TableCell>
                                <TableCell className="text-right text-sm text-gray-900 dark:text-zinc-100">{row.price_bottle != null ? row.price_bottle : "—"}</TableCell>
                                <TableCell>{confidenceBadge(row.confidence_label)}</TableCell>
                                <TableCell><ReviewCell needsReview={row.needs_review} reviewReasons={row.review_reasons} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
                {uncategorizedRows.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-2">Övriga rader</h3>
                    <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 hover:bg-transparent">
                            <TableHead className="w-8 text-xs">#</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Råtext</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Producent</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Vinnamn</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Årgång</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Land</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-400">Region</TableHead>
                            <TableHead className="text-right text-xs">Glas</TableHead>
                            <TableHead className="text-right text-xs">Flaska</TableHead>
                            <TableHead className="text-xs">Confidence</TableHead>
                            <TableHead className="text-xs">Review</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uncategorizedRows.map((row) => (
                            <TableRow
                              key={row.id}
                              className={
                                row.needs_review
                                  ? "bg-amber-50/90 dark:bg-amber-900/25 border-gray-100 dark:border-zinc-800"
                                  : "border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/30"
                              }
                            >
                              <TableCell className="text-gray-500 dark:text-zinc-400 text-sm">{row.row_index + 1}</TableCell>
                              <TableCell className="max-w-[200px]">
                                <RawTextCell
                                  rawText={row.raw_text}
                                  rowId={row.id}
                                  expanded={expandedRaw.has(row.id)}
                                  onToggle={() => toggleRaw(row.id)}
                                />
                              </TableCell>
                              <TableCell className="text-sm text-gray-900 dark:text-zinc-100">{row.producer ?? "—"}</TableCell>
                              <TableCell className="text-sm font-medium text-gray-900 dark:text-zinc-100">{row.wine_name ?? "—"}</TableCell>
                              <TableCell className="text-sm">{row.vintage ?? "—"}</TableCell>
                              <TableCell className="text-sm">{row.country ?? "—"}</TableCell>
                              <TableCell className="text-sm">{row.region ?? "—"}</TableCell>
                              <TableCell className="text-right text-sm">{row.price_glass != null ? row.price_glass : "—"}</TableCell>
                              <TableCell className="text-right text-sm">{row.price_bottle != null ? row.price_bottle : "—"}</TableCell>
                              <TableCell>{confidenceBadge(row.confidence_label)}</TableCell>
                              <TableCell><ReviewCell needsReview={row.needs_review} reviewReasons={row.review_reasons} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function RawTextCell({
  rawText,
  rowId,
  expanded,
  onToggle,
}: {
  rawText: string;
  rowId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isLong = rawText.length > RAW_TEXT_TRUNCATE;
  const display = isLong && !expanded
    ? `${rawText.slice(0, RAW_TEXT_TRUNCATE)}…`
    : rawText;
  return (
    <div className="text-sm text-gray-900 dark:text-zinc-100">
      {isLong ? (
        <Collapsible open={expanded} onOpenChange={() => onToggle()}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="text-left hover:underline flex items-center gap-1 text-blue-600 dark:text-blue-400"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              {display}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-1 text-gray-600 dark:text-zinc-400 break-words">
              {rawText}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <span className="break-words">{display}</span>
      )}
    </div>
  );
}

function ReviewCell({
  needsReview,
  reviewReasons,
}: {
  needsReview: boolean;
  reviewReasons: string[] | null;
}) {
  const reasons = reviewReasons ?? [];
  const hasGrapesInferred = reasons.includes("grapes_inferred");
  const content = (
    <div className="flex items-center gap-1">
      {needsReview && (
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
      )}
      {reasons.length > 0 ? (
        <span className="text-xs text-gray-700 dark:text-zinc-300">
          {hasGrapesInferred && (
            <span className="text-amber-700 dark:text-amber-300 font-medium" title="Druvor som AI gissat – inte fakta">
              grapes_inferred
              {reasons.length > 1 ? "; " : ""}
            </span>
          )}
          {reasons.filter((r) => r !== "grapes_inferred").join(", ")}
        </span>
      ) : (
        <span className="text-gray-500 dark:text-zinc-400">—</span>
      )}
    </div>
  );
  if (reasons.length > 2) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help truncate max-w-[140px]">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs bg-white dark:bg-[#1F1F23] border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100">
          <p className="font-medium mb-1">Review reasons:</p>
          <ul className="list-disc list-inside text-xs">
            {reasons.map((r) => (
              <li key={r}>
                {r === "grapes_inferred"
                  ? "grapes_inferred (druvor som AI gissat – inte fakta)"
                  : r}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  }
  return content;
}
