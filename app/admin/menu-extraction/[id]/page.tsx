"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ArrowLeft, Play, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
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
      pending: { label: "Väntar", className: "bg-gray-500" },
      processing: { label: "Kör", className: "bg-amber-500" },
      completed: { label: "Klar", className: "bg-green-600" },
      failed: { label: "Misslyckad", className: "bg-red-600" },
    };
    const { label, className } = v[status] ?? v.pending;
    return (
      <Badge className={`${className} text-white hover:opacity-90`}>
        {label}
      </Badge>
    );
  };

  const confidenceBadge = (label: ConfidenceLabel | null) => {
    if (!label) return <span className="text-muted-foreground">—</span>;
    const v = {
      high: "bg-green-600 text-white",
      medium: "bg-amber-500 text-white",
      low: "bg-red-600 text-white",
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
      <div className="space-y-6">
        <p className="text-muted-foreground">Ogiltigt dokument-id.</p>
        <Link href="/admin/menu-extraction">
          <Button variant="outline">Tillbaka till listan</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Dokumentet hittades inte.</p>
        <Link href="/admin/menu-extraction">
          <Button variant="outline">Tillbaka till listan</Button>
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/menu-extraction">
            <Button variant="ghost" size="icon" aria-label="Tillbaka">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{doc.file_name}</h1>
            <p className="text-sm text-gray-600">{doc.file_path}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Dokument</CardTitle>
                <CardDescription>
                  Status: {statusBadge(doc.extraction_status)}
                  {doc.error_message && (
                    <span className="ml-2 text-red-600 text-xs">
                      {doc.error_message}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button
                onClick={handleExtract}
                disabled={extracting}
              >
                {extracting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Kör extraction…
                  </span>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Kör extraction
                  </>
                )}
              </Button>
            </div>
            {!doc.raw_text?.trim() && (
              <div className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-900">Vad betyder &quot;raw text saknas&quot;?</p>
                <p className="text-amber-800">
                  <strong>Raw text</strong> är den text som lästs ut ur PDF:en. AI-extraktion behöver den för att kunna plocka ut viner och priser.
                  Om fältet är tomt kan det bero på: (1) PDF:en är skannad (bilder utan textlager), (2) texten extraherades inte vid nedladdning, eller (3) dokumentet skapades innan text-extraktion fanns.
                </p>
                <p className="text-amber-800">
                  <strong>Åtgärd:</strong> Om PDF:en ligger i lagringen kan du försöka extrahera text igen med knappen nedan. Fungerar det inte är PDF:en troligen skannad – då behövs OCR (stöds inte här) eller manuell inmatning.
                </p>
                {doc.file_path?.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExtractText}
                    disabled={extractTextLoading}
                  >
                    {extractTextLoading ? "Extraherar text…" : "Extrahera text från PDF"}
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Uppladdad</span>
                <p className="font-medium">
                  {doc.created_at
                    ? new Date(doc.created_at).toLocaleString("sv-SE")
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Extraherad</span>
                <p className="font-medium">
                  {doc.extracted_at
                    ? new Date(doc.extracted_at).toLocaleString("sv-SE")
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Modell / prompt / workflow</span>
                <p className="font-medium truncate" title={`${doc.model_version ?? ""} / ${doc.prompt_version ?? ""} / ${doc.workflow_version ?? ""}`}>
                  {doc.model_version ?? "—"} / {doc.prompt_version ?? "—"} / {doc.workflow_version ?? "—"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <strong>Totalt rader:</strong> {stats.total_rows}
              </span>
              <span>
                <strong>Needs review:</strong> {stats.needs_review_count}
              </span>
              <span>
                <strong>High confidence:</strong> {stats.high_confidence_count}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Extraherade rader</CardTitle>
            <CardDescription>
              Grupperat per sektion. Rader som behöver granskning har gul bakgrund.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {sections.length === 0 && uncategorizedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Inga rader ännu. Kör extraction ovan.
              </p>
            ) : (
              <>
                {sections.map((sec) => {
                  const sectionRows = rowsBySection.get(sec.id) ?? [];
                  if (sectionRows.length === 0) return null;
                  return (
                    <div key={sec.id}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        {sec.section_name}
                        {sec.normalized_section && (
                          <span className="text-muted-foreground font-normal ml-2">
                            ({sec.normalized_section})
                          </span>
                        )}
                      </h3>
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="w-8">#</TableHead>
                              <TableHead>Råtext</TableHead>
                              <TableHead>Producent</TableHead>
                              <TableHead>Vinnamn</TableHead>
                              <TableHead>Årgång</TableHead>
                              <TableHead>Land</TableHead>
                              <TableHead>Region</TableHead>
                              <TableHead className="text-right">Glas</TableHead>
                              <TableHead className="text-right">Flaska</TableHead>
                              <TableHead>Confidence</TableHead>
                              <TableHead>Review</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sectionRows.map((row) => (
                              <TableRow
                                key={row.id}
                                className={
                                  row.needs_review
                                    ? "bg-amber-50/70 hover:bg-amber-100/70"
                                    : ""
                                }
                              >
                                <TableCell className="text-muted-foreground text-sm">
                                  {row.row_index + 1}
                                </TableCell>
                                <TableCell className="max-w-[200px]">
                                  <RawTextCell
                                    rawText={row.raw_text}
                                    rowId={row.id}
                                    expanded={expandedRaw.has(row.id)}
                                    onToggle={() => toggleRaw(row.id)}
                                  />
                                </TableCell>
                                <TableCell className="text-sm">
                                  {row.producer ?? "—"}
                                </TableCell>
                                <TableCell className="text-sm font-medium">
                                  {row.wine_name ?? "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {row.vintage ?? "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {row.country ?? "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {row.region ?? "—"}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {row.price_glass != null ? row.price_glass : "—"}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {row.price_bottle != null ? row.price_bottle : "—"}
                                </TableCell>
                                <TableCell>
                                  {confidenceBadge(row.confidence_label)}
                                </TableCell>
                                <TableCell>
                                  <ReviewCell
                                    needsReview={row.needs_review}
                                    reviewReasons={row.review_reasons}
                                  />
                                </TableCell>
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
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Övriga rader
                    </h3>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Råtext</TableHead>
                            <TableHead>Producent</TableHead>
                            <TableHead>Vinnamn</TableHead>
                            <TableHead>Årgång</TableHead>
                            <TableHead>Land</TableHead>
                            <TableHead>Region</TableHead>
                            <TableHead className="text-right">Glas</TableHead>
                            <TableHead className="text-right">Flaska</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead>Review</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uncategorizedRows.map((row) => (
                            <TableRow
                              key={row.id}
                              className={
                                row.needs_review
                                  ? "bg-amber-50/70 hover:bg-amber-100/70"
                                  : ""
                              }
                            >
                              <TableCell className="text-muted-foreground text-sm">
                                {row.row_index + 1}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <RawTextCell
                                  rawText={row.raw_text}
                                  rowId={row.id}
                                  expanded={expandedRaw.has(row.id)}
                                  onToggle={() => toggleRaw(row.id)}
                                />
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.producer ?? "—"}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                {row.wine_name ?? "—"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.vintage ?? "—"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.country ?? "—"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.region ?? "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {row.price_glass != null ? row.price_glass : "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {row.price_bottle != null ? row.price_bottle : "—"}
                              </TableCell>
                              <TableCell>
                                {confidenceBadge(row.confidence_label)}
                              </TableCell>
                              <TableCell>
                                <ReviewCell
                                  needsReview={row.needs_review}
                                  reviewReasons={row.review_reasons}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
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
    <div className="text-sm">
      {isLong ? (
        <Collapsible open={expanded} onOpenChange={() => onToggle()}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="text-left hover:underline flex items-center gap-1"
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
            <div className="pt-1 text-muted-foreground break-words">
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
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" aria-hidden />
      )}
      {reasons.length > 0 ? (
        <span className="text-xs">
          {hasGrapesInferred && (
            <span className="text-amber-700 font-medium" title="Druvor som AI gissat – inte fakta">
              grapes_inferred
              {reasons.length > 1 ? "; " : ""}
            </span>
          )}
          {reasons.filter((r) => r !== "grapes_inferred").join(", ")}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
  if (reasons.length > 2) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help truncate max-w-[140px]">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
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
